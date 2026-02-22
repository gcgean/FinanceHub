import { useMemo, useState } from "react";
import { 
  Plus, Search, Building2, MoreHorizontal, 
  Eye, Edit, Trash2, CheckCircle, XCircle, Clock,
  Mail, Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { planLabels } from "@/data/mockAdminData";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCompany, deleteCompany, listCompanies, updateCompany, type Company } from "@/api/companies";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type CompanyRow = Company & { transactionsMonth: number; pendenciesOpen: number }

export default function Companies() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const setActiveCompanyId = useAuthStore((s) => s.setCompanyId)
  const isAdmin = role === "ADMIN"
  const companiesQuery = useQuery({
    queryKey: ["admin", "companies"],
    enabled: Boolean(isAdmin),
    queryFn: () => listCompanies(),
  })
  const items: CompanyRow[] = useMemo(() => companiesQuery.data?.items ?? [], [companiesQuery.data?.items])
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editing, setEditing] = useState<{ id?: string; name: string; cnpj: string | null; email?: string | null; phone?: string | null; plan?: Company["plan"]; status?: Company["status"] } | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<{ name: string; cnpj: string | null; email: string | null; phone: string | null; plan: Company["plan"]; status: Company["status"]; }>({ // TODO: personType was here
    name: "",
    cnpj: null,
    email: null,
    phone: null,
    plan: "PROFESSIONAL",
    status: "ACTIVE",
  })

  const filteredCompanies = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return items.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.document ?? "").toLowerCase().includes(q)
    )
  }, [items, searchTerm])

  const createMut = useMutation({
    mutationFn: (p: { name: string; document?: string | null; email?: string | null; phone?: string | null; plan?: Company["plan"]; status?: Company["status"] }) => createCompany(p),
    onSuccess: async (company) => {
      toast({ title: "Empresa criada" })
      setIsAddingNew(false)
      setActiveCompanyId(company.id)
      await qc.invalidateQueries({ queryKey: ["admin", "companies"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao criar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: (p: { id: string; name: string; document?: string | null; email?: string | null; phone?: string | null; plan?: Company["plan"]; status?: Company["status"] }) =>
      updateCompany(p.id, { name: p.name, document: p.document, email: p.email, phone: p.phone, plan: p.plan, status: p.status }),
    onSuccess: async () => {
      toast({ title: "Empresa atualizada" })
      setEditing(null)
      await qc.invalidateQueries({ queryKey: ["admin", "companies"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao atualizar", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: async () => {
      toast({ title: "Empresa excluída" })
      await qc.invalidateQueries({ queryKey: ["admin", "companies"] })
    },
    onError: (e: unknown) => toast({ title: "Erro ao excluir", description: e instanceof Error ? e.message : undefined, variant: "destructive" }),
  })

  const getStatusBadge = (status: "ACTIVE" | "INACTIVE" | "PENDING") => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-success/10 text-success"><CheckCircle className="w-3 h-3 mr-1" /> Ativo</Badge>;
      case "INACTIVE":
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Inativo</Badge>;
      case "PENDING":
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  const getPlanBadge = (plan: Company['plan']) => {
    const key = plan.toLowerCase() as 'basic' | 'professional' | 'enterprise'
    const colors = {
      basic: 'bg-muted text-muted-foreground',
      professional: 'bg-primary/10 text-primary',
      enterprise: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    };
    return <Badge className={colors[key]}>{planLabels[key]}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Empresas</h2>
          <p className="text-muted-foreground">
            Gerencie os clientes do BPO financeiro
          </p>
        </div>
        <Dialog
          open={isAddingNew}
          onOpenChange={(v) => {
            setIsAddingNew(v)
            if (!v) {
              setCreateForm({ name: "", cnpj: null, email: null, phone: null, plan: "PROFESSIONAL", status: "ACTIVE" })
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setEditId(null) }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Nova Empresa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
              <Label>Razão Social</Label>
              <Input placeholder="Nome da empresa" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input placeholder="00.000.000/0000-00" value={createForm.cnpj ?? ""} onChange={(e) => setCreateForm((f) => ({ ...f, cnpj: e.target.value }))} />
            </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input placeholder="contato@empresa.com" value={createForm.email ?? ""} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input placeholder="(00) 00000-0000" value={createForm.phone ?? ""} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select value={createForm.plan} onValueChange={(v) => setCreateForm((f) => ({ ...f, plan: v as Company["plan"] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BASIC">Básico</SelectItem>
                      <SelectItem value="PROFESSIONAL">Profissional</SelectItem>
                      <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={createForm.status} onValueChange={(v) => setCreateForm((f) => ({ ...f, status: v as Company["status"] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Ativo</SelectItem>
                      <SelectItem value="PENDING">Pendente</SelectItem>
                      <SelectItem value="INACTIVE">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={async () => {
                  const name = createForm.name.trim()
                  const document = (createForm.cnpj ?? "").trim()
                  if (!name) {
                    toast({ title: "Informe a razão social ou nome", variant: "destructive" })
                    return
                  }
                  await createMut.mutateAsync({
                    name,
                    document: document || undefined,
                    email: createForm.email ?? null,
                    phone: createForm.phone ?? null,
                    plan: createForm.plan,
                    status: createForm.status,
                  })
                  setCreateForm({ name: "", cnpj: null, email: null, phone: null, plan: "PROFESSIONAL", status: "ACTIVE" })
                }}
                disabled={createMut.isPending}
              >
                {createMut.isPending ? "Cadastrando..." : "Cadastrar Empresa"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total de Empresas</p>
          <p className="text-2xl font-bold text-foreground">{items.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Empresas Ativas</p>
          <p className="text-2xl font-bold text-success">{items.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pendências Totais</p>
          <p className="text-2xl font-bold text-warning">{items.reduce((acc, c) => acc + (c.pendenciesOpen ?? 0), 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Transações no Mês</p>
          <p className="text-2xl font-bold text-foreground">{items.reduce((acc, c) => acc + (c.transactionsMonth ?? 0), 0).toLocaleString()}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou CNPJ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Transações</TableHead>
              <TableHead className="text-right">Pendências</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companiesQuery.isLoading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filteredCompanies.map(company => (
              <TableRow key={company.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{company.name}</p>
                      <p className="text-xs text-muted-foreground">{company.document ?? ""}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="w-3 h-3" /> {company.email ?? ""}
                    </p>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="w-3 h-3" /> {company.phone ?? ""}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{getPlanBadge(company.plan)}</TableCell>
                <TableCell>{getStatusBadge(company.status)}</TableCell>
                <TableCell className="text-right font-medium">
                  {(company.transactionsMonth ?? 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {(company.pendenciesOpen ?? 0) > 0 ? (
                    <Badge variant="outline" className="text-warning border-warning">
                      {company.pendenciesOpen}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditId(company.id); setEditing({ id: company.id, name: company.name, cnpj: company.cnpj }) }}>
                        <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setEditId(company.id); setEditing({ id: company.id, name: company.name, document: company.document, email: company.email ?? null, phone: company.phone ?? null, plan: company.plan, status: company.status }) }}>
                        <Edit className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={async () => { await deleteMut.mutateAsync(company.id) }}>
                        <Trash2 className="w-4 h-4 mr-2" /> Desativar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={Boolean(editing)} onOpenChange={(v) => { if (!v) { setEditing(null); setEditId(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Razão Social / Nome</Label>
              <Input value={editing?.name ?? ""} onChange={(e) => setEditing((prev) => prev ? { ...prev, name: e.target.value } : prev)} />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input placeholder="00.000.000/0000-00" value={editing?.cnpj ?? ""} onChange={(e) => setEditing((prev) => prev ? { ...prev, cnpj: e.target.value } : prev)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={editing?.email ?? ""} onChange={(e) => setEditing((prev) => prev ? { ...prev, email: e.target.value } : prev)} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={editing?.phone ?? ""} onChange={(e) => setEditing((prev) => prev ? { ...prev, phone: e.target.value } : prev)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={editing?.plan ?? "PROFESSIONAL"} onValueChange={(v) => setEditing((prev) => prev ? { ...prev, plan: v as Company["plan"] } : prev)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASIC">Básico</SelectItem>
                    <SelectItem value="PROFESSIONAL">Profissional</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editing?.status ?? "ACTIVE"} onValueChange={(v) => setEditing((prev) => prev ? { ...prev, status: v as Company["status"] } : prev)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="INACTIVE">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button
                onClick={async () => {
                  const currentId = editing?.id ?? editId ?? null
                  const fallbackId = (!currentId && editing)
                    ? (items.find((c) => c.document === (editing.document ?? "") && c.name === editing.name)?.id ?? null)
                    : null
                  const finalId = currentId ?? fallbackId
                  if (!finalId || String(finalId).trim().length < 1) {
                    toast({ title: "ID inválido para atualização", variant: "destructive" })
                    return
                  }
                  const payload = { id: finalId, name: editing.name.trim(), cnpj: (editing.cnpj ?? "").trim() || null, email: (editing?.email ?? "").trim() || null, phone: (editing?.phone ?? "").trim() || null, plan: editing?.plan, status: editing?.status }
                  if (!payload.name) {
                    toast({ title: "Informe a razão social", variant: "destructive" })
                    return
                  }
                  await updateMut.mutateAsync(payload)
                }}
                disabled={updateMut.isPending}
              >
                {updateMut.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
