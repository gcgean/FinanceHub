import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, Search, MoreHorizontal, Eye, Edit, Trash2,
  CheckCircle, XCircle, Mail, Shield, ShieldCheck, Building2, Loader2, X,
  MessageCircle, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { usersApi, type User, type CreateUserPayload, type UpdateUserPayload } from "@/api/users";
import { listCompanies } from "@/api/companies";
import { accessGroupsApi, type AccessGroup } from "@/api/access-groups";
import { telegramApi } from "@/api/telegram";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  CLIENT: "Cliente",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  OPERATOR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CLIENT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Dialog de Criar/Editar ────────────────────────────────────────────────────
type DialogMode = { type: "create" } | { type: "edit"; user: User } | { type: "view"; user: User };

function UserDialog({
  mode,
  companies,
  accessGroups,
  onClose,
  onSave,
  saving,
  onTestTelegram,
  telegramTesting,
}: {
  mode: DialogMode;
  companies: { id: string; name: string }[];
  accessGroups: AccessGroup[];
  onClose: () => void;
  onSave: (data: CreateUserPayload | UpdateUserPayload) => void;
  saving: boolean;
  onTestTelegram?: (userId: string) => void;
  telegramTesting?: boolean;
}) {
  const isView = mode.type === "view";
  const isEdit = mode.type === "edit";
  const user = (isEdit || isView) ? mode.user : null;

  const [name,       setName]       = useState(user?.name ?? "");
  const [email,      setEmail]      = useState(user?.email ?? "");
  const [password,   setPassword]   = useState("");
  const [role,       setRole]       = useState<string>(user?.role ?? "OPERATOR");
  const [active,     setActive]     = useState(user?.active ?? true);
  const [selCompIds, setSelCompIds] = useState<string[]>(
    user?.userCompanies?.map(uc => uc.companyId) ?? []
  );
  const [compPopover,    setCompPopover]    = useState(false);
  const [accessGroupId,  setAccessGroupId]  = useState<string | null>(user?.accessGroupId ?? null);

  const toggleComp = (id: string) =>
    setSelCompIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const compLabel = useMemo(() => {
    if (selCompIds.length === 0) return "Nenhuma empresa";
    if (selCompIds.length === 1) return companies.find(c => c.id === selCompIds[0])?.name ?? selCompIds[0];
    return `${selCompIds.length} empresas`;
  }, [selCompIds, companies]);

  const handleSave = () => {
    if (mode.type === "create") {
      onSave({ name, email, password, role: role as User["role"], companyIds: selCompIds, companyId: selCompIds[0] ?? null });
    } else {
      const upd: UpdateUserPayload = { name, role: role as User["role"], active, companyIds: selCompIds, companyId: selCompIds[0] ?? null, accessGroupId: accessGroupId || null };
      if (password) upd.password = password;
      onSave(upd);
    }
  };

  return (
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>
          {mode.type === "create" ? "Novo Usuário" : isView ? "Detalhes do Usuário" : "Editar Usuário"}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>Nome Completo</Label>
          <Input value={name} onChange={e => setName(e.target.value)} disabled={isView} placeholder="Nome do usuário" />
        </div>

        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input value={email} onChange={e => setEmail(e.target.value)} disabled={isView || isEdit} type="email" placeholder="email@exemplo.com" />
        </div>

        {!isView && (
          <div className="space-y-1.5">
            <Label>{isEdit ? "Nova Senha (deixe em branco para manter)" : "Senha"}</Label>
            <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder={isEdit ? "••••••••" : "Mínimo 6 caracteres"} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Perfil</Label>
          {isView ? (
            <Badge className={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Badge>
          ) : (
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Administrador</SelectItem>
                <SelectItem value="OPERATOR">Operador</SelectItem>
                <SelectItem value="CLIENT">Cliente</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Multi-empresa */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Empresas Vinculadas</Label>
          {isView ? (
            <div className="flex flex-wrap gap-1.5">
              {user?.userCompanies?.length === 0 && <span className="text-sm text-muted-foreground">Nenhuma empresa</span>}
              {user?.userCompanies?.map(uc => (
                <Badge key={uc.id} variant="outline" className="text-xs">{uc.company.name}</Badge>
              ))}
            </div>
          ) : (
            <Popover open={compPopover} onOpenChange={setCompPopover}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal text-sm">
                  <span className="truncate">{compLabel}</span>
                  <Building2 className="w-4 h-4 shrink-0 ml-2 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full min-w-[340px] p-2" align="start">
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {companies.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1">Nenhuma empresa cadastrada</p>}
                  {companies.map(c => (
                    <button
                      key={c.id}
                      className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"
                      onClick={() => toggleComp(c.id)}
                    >
                      <Checkbox checked={selCompIds.includes(c.id)} readOnly />
                      {c.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Telegram */}
        {(isEdit || isView) && user && (
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> Telegram</Label>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${user.telegramChatId ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                <span className="text-sm">
                  {user.telegramChatId
                    ? <span className="text-green-600 dark:text-green-400 font-medium">Conectado ao Telegram</span>
                    : <span className="text-muted-foreground">Não conectado</span>
                  }
                </span>
              </div>
              {user.telegramChatId && onTestTelegram && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTestTelegram(user.id)}
                  disabled={telegramTesting}
                  className="h-7 text-xs"
                >
                  {telegramTesting
                    ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                    : <Send className="w-3 h-3 mr-1.5" />
                  }
                  Enviar teste
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Grupo de Acesso */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Grupo de Acesso</Label>
          {isView ? (
            <span className="text-sm text-foreground">
              {user?.accessGroup?.name ?? <span className="text-muted-foreground">Sem grupo (acesso total)</span>}
            </span>
          ) : (
            <Select value={accessGroupId ?? "__none__"} onValueChange={v => setAccessGroupId(v === "__none__" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sem grupo (acesso total)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem grupo (acesso total)</SelectItem>
                {accessGroups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {isEdit && (
          <div className="flex items-center gap-2 pt-1">
            <Checkbox checked={active} onCheckedChange={v => setActive(!!v)} id="active-chk" />
            <Label htmlFor="active-chk" className="cursor-pointer">Usuário ativo</Label>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Fechar</Button>
        {!isView && (
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode.type === "create" ? "Criar Usuário" : "Salvar"}
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function Users() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dialog,     setDialog]     = useState<DialogMode | null>(null);
  const [delUser,    setDelUser]    = useState<User | null>(null);

  // ── queries ──────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list({ take: 200 }),
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies"],
    queryFn: listCompanies,
  });

  const { data: groupsData = [] } = useQuery({
    queryKey: ["access-groups"],
    queryFn: accessGroupsApi.list,
  });

  const users     = data?.items ?? [];
  const companies = companiesData?.items ?? [];

  // ── filtro local ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => users.filter(u => {
    const q = search.toLowerCase();
    const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchR = roleFilter === "all" || u.role === roleFilter;
    return matchQ && matchR;
  }), [users, search, roleFilter]);

  // ── mutations ─────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (d: CreateUserPayload) => usersApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setDialog(null); toast({ title: "Usuário criado com sucesso!" }); },
    onError: (e: Error) => toast({ title: "Erro ao criar usuário", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPayload }) => usersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setDialog(null); toast({ title: "Usuário atualizado!" }); },
    onError: (e: Error) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setDelUser(null); toast({ title: "Usuário removido." }); },
    onError: (e: Error) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
  });

  const handleSave = (d: CreateUserPayload | UpdateUserPayload) => {
    if (dialog?.type === "create") createMut.mutate(d as CreateUserPayload);
    else if (dialog?.type === "edit") updateMut.mutate({ id: dialog.user.id, data: d as UpdateUserPayload });
  };

  const saving = createMut.isPending || updateMut.isPending;

  const telegramTestMut = useMutation({
    mutationFn: (userId: string) => telegramApi.sendTestToUser(userId),
    onSuccess: () => toast({ title: "✅ Mensagem enviada!", description: "Verifique o Telegram do usuário." }),
    onError: (e: Error) => toast({ title: "Erro ao enviar", description: e.message.includes("NOT_CONNECTED") ? "Usuário não tem Telegram conectado." : e.message, variant: "destructive" }),
  });

  // ── stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     users.length,
    admin:     users.filter(u => u.role === "ADMIN").length,
    operator:  users.filter(u => u.role === "OPERATOR").length,
    client:    users.filter(u => u.role === "CLIENT").length,
  }), [users]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Usuários</h2>
          <p className="text-muted-foreground">Gerencie os acessos ao sistema</p>
        </div>
        <Button onClick={() => setDialog({ type: "create" })}>
          <Plus className="w-4 h-4 mr-2" /> Novo Usuário
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total de Usuários", value: stats.total, color: "text-foreground" },
          { label: "Administradores",   value: stats.admin,    color: "text-purple-600" },
          { label: "Operadores",        value: stats.operator, color: "text-blue-600" },
          { label: "Clientes",          value: stats.client,   color: "text-green-600" },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <Shield className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Perfil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os perfis</SelectItem>
            <SelectItem value="ADMIN">Administrador</SelectItem>
            <SelectItem value="OPERATOR">Operador</SelectItem>
            <SelectItem value="CLIENT">Cliente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Empresas</TableHead>
              <TableHead>Grupo de Acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último Acesso</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : filtered.map(user => (
              <TableRow key={user.id} className="hover:bg-muted/30">
                {/* Avatar + nome */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold
                      ${user.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Role */}
                <TableCell>
                  <Badge className={ROLE_COLORS[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                </TableCell>

                {/* Empresas */}
                <TableCell>
                  {user.userCompanies.length === 0 ? (
                    <span className="text-muted-foreground text-xs">—</span>
                  ) : user.userCompanies.length === 1 ? (
                    <span className="text-sm">{user.userCompanies[0].company.name}</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {user.userCompanies.slice(0, 2).map(uc => (
                        <Badge key={uc.id} variant="outline" className="text-xs">{uc.company.name}</Badge>
                      ))}
                      {user.userCompanies.length > 2 && (
                        <Badge variant="secondary" className="text-xs">+{user.userCompanies.length - 2}</Badge>
                      )}
                    </div>
                  )}
                </TableCell>

                {/* Grupo de Acesso */}
                <TableCell>
                  {user.accessGroup
                    ? <Badge variant="outline" className="text-xs"><ShieldCheck className="w-3 h-3 mr-1" />{user.accessGroup.name}</Badge>
                    : <span className="text-muted-foreground text-xs">—</span>
                  }
                </TableCell>

                {/* Status + Telegram */}
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {user.active
                      ? <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Ativo</Badge>
                      : <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Inativo</Badge>
                    }
                    {user.telegramChatId && (
                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700">
                        <MessageCircle className="w-3 h-3 mr-1" />Telegram
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Último acesso */}
                <TableCell className="text-sm text-muted-foreground">
                  {user.lastLoginAt
                    ? formatDistanceToNow(new Date(user.lastLoginAt), { locale: ptBR, addSuffix: true })
                    : "Nunca"}
                </TableCell>

                {/* Ações */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDialog({ type: "view", user })}>
                        <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDialog({ type: "edit", user })}>
                        <Edit className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => updateMut.mutate({ id: user.id, data: { active: !user.active } })}
                      >
                        {user.active
                          ? <><XCircle className="w-4 h-4 mr-2" /> Desativar</>
                          : <><CheckCircle className="w-4 h-4 mr-2" /> Ativar</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDelUser(user)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length > 0 && (
          <div className="p-4 border-t text-xs text-muted-foreground">
            {filtered.length} usuário(s) exibido(s)
          </div>
        )}
      </Card>

      {/* Dialog criar/editar/ver */}
      {dialog && (
        <Dialog open onOpenChange={() => setDialog(null)}>
          <UserDialog
            mode={dialog}
            companies={companies}
            accessGroups={groupsData}
            onClose={() => setDialog(null)}
            onSave={handleSave}
            saving={saving}
            onTestTelegram={(userId) => telegramTestMut.mutate(userId)}
            telegramTesting={telegramTestMut.isPending}
          />
        </Dialog>
      )}

      {/* Confirmação de exclusão */}
      {delUser && (
        <Dialog open onOpenChange={() => setDelUser(null)}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              Tem certeza que deseja excluir o usuário <strong>{delUser.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDelUser(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => deleteMut.mutate(delUser.id)}
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
