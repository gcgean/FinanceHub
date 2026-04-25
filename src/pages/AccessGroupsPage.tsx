import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Shield, Users, ChevronDown, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { accessGroupsApi, type AccessGroup } from "@/api/access-groups";
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from "@/lib/permissions";

type DialogMode = { type: "create" } | { type: "edit"; group: AccessGroup };

function GroupDialog({
  mode,
  onClose,
  onSave,
  saving,
}: {
  mode: DialogMode;
  onClose: () => void;
  onSave: (name: string, description: string, permissions: string[]) => void;
  saving: boolean;
}) {
  const group = mode.type === "edit" ? mode.group : null;
  const [name,        setName]        = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [selected,    setSelected]    = useState<string[]>(group?.permissions ?? []);

  const togglePerm = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const toggleGroup = (grp: string) => {
    const ids = ALL_PERMISSIONS.filter(p => p.group === grp).map(p => p.id);
    const allSelected = ids.every(id => selected.includes(id));
    if (allSelected) {
      setSelected(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelected(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const selectAll = () => setSelected(ALL_PERMISSIONS.map(p => p.id));
  const clearAll  = () => setSelected([]);

  return (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle>{mode.type === "create" ? "Novo Grupo de Acesso" : "Editar Grupo"}</DialogTitle>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
        <div className="space-y-1.5">
          <Label>Nome do Grupo</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Suporte, Financeiro, Gerência..." />
        </div>

        <div className="space-y-1.5">
          <Label>Descrição (opcional)</Label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o nível de acesso deste grupo..." />
        </div>

        {/* Permissions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Permissões de Acesso</Label>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-primary hover:underline">Selecionar tudo</button>
              <span className="text-muted-foreground text-xs">·</span>
              <button onClick={clearAll} className="text-xs text-muted-foreground hover:underline">Limpar</button>
            </div>
          </div>

          <div className="space-y-3">
            {PERMISSION_GROUPS.map(grp => {
              const items = ALL_PERMISSIONS.filter(p => p.group === grp);
              const allSel = items.every(p => selected.includes(p.id));
              const someSel = items.some(p => selected.includes(p.id));
              return (
                <div key={grp} className="rounded-lg border p-3 space-y-2">
                  {/* Cabeçalho do grupo */}
                  <button
                    className="w-full flex items-center justify-between"
                    onClick={() => toggleGroup(grp)}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allSel}
                        data-state={someSel && !allSel ? "indeterminate" : undefined}
                        readOnly
                        className={someSel && !allSel ? "opacity-60" : ""}
                      />
                      <span className="text-sm font-medium">{grp}</span>
                      <Badge variant="secondary" className="text-xs">
                        {items.filter(p => selected.includes(p.id)).length}/{items.length}
                      </Badge>
                    </div>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>

                  {/* Itens */}
                  <div className="grid grid-cols-2 gap-1.5 pl-6">
                    {items.map(perm => (
                      <button
                        key={perm.id}
                        onClick={() => togglePerm(perm.id)}
                        className="flex items-center gap-2 text-left text-sm py-0.5 hover:text-foreground text-muted-foreground"
                      >
                        <Checkbox checked={selected.includes(perm.id)} readOnly className="shrink-0" />
                        {perm.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            {selected.length} de {ALL_PERMISSIONS.length} permissões selecionadas
            {selected.length === 0 && " — sem restrições (acesso total)"}
          </p>
        </div>
      </div>

      <DialogFooter className="border-t pt-4">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => onSave(name, description, selected)} disabled={saving || !name.trim()}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {mode.type === "create" ? "Criar Grupo" : "Salvar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function AccessGroupsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog,   setDialog]   = useState<DialogMode | null>(null);
  const [delGroup, setDelGroup] = useState<AccessGroup | null>(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["access-groups"],
    queryFn: accessGroupsApi.list,
  });

  const createMut = useMutation({
    mutationFn: (d: Parameters<typeof accessGroupsApi.create>[0]) => accessGroupsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["access-groups"] }); setDialog(null); toast({ title: "Grupo criado!" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Parameters<typeof accessGroupsApi.update>[1] }) => accessGroupsApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["access-groups"] }); setDialog(null); toast({ title: "Grupo atualizado!" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => accessGroupsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["access-groups"] }); setDelGroup(null); toast({ title: "Grupo removido." }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const saving = createMut.isPending || updateMut.isPending;

  const handleSave = (name: string, description: string, permissions: string[]) => {
    const payload = { name, description: description || null, permissions };
    if (dialog?.type === "create") createMut.mutate(payload);
    else if (dialog?.type === "edit") updateMut.mutate({ id: dialog.group.id, d: payload });
  };

  const permLabel = (perms: string[]) => {
    if (perms.length === 0) return "Acesso Total";
    if (perms.length === ALL_PERMISSIONS.length) return "Acesso Total";
    return `${perms.length} permissões`;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Grupos de Acesso</h2>
          <p className="text-muted-foreground">Defina quais módulos cada grupo de usuários pode acessar.</p>
        </div>
        <Button onClick={() => setDialog({ type: "create" })}>
          <Plus className="w-4 h-4 mr-2" /> Novo Grupo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Shield className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum grupo de acesso cadastrado.</p>
            <Button className="mt-4" onClick={() => setDialog({ type: "create" })}>
              <Plus className="w-4 h-4 mr-2" /> Criar primeiro grupo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map(group => (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      {group.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setDialog({ type: "edit", group })}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDelGroup(group)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {group._count?.users ?? 0} usuário(s)
                  </span>
                  <span>·</span>
                  <Badge variant={group.permissions.length === 0 ? "default" : "secondary"} className="text-xs">
                    {permLabel(group.permissions)}
                  </Badge>
                </div>

                {group.permissions.length > 0 && group.permissions.length < ALL_PERMISSIONS.length && (
                  <div className="flex flex-wrap gap-1">
                    {PERMISSION_GROUPS.map(grp => {
                      const items = ALL_PERMISSIONS.filter(p => p.group === grp);
                      const count = items.filter(p => group.permissions.includes(p.id)).length;
                      if (count === 0) return null;
                      return (
                        <Badge key={grp} variant="outline" className="text-xs">
                          {grp} ({count}/{items.length})
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog criar/editar */}
      {dialog && (
        <Dialog open onOpenChange={() => setDialog(null)}>
          <GroupDialog mode={dialog} onClose={() => setDialog(null)} onSave={handleSave} saving={saving} />
        </Dialog>
      )}

      {/* Confirmar exclusão */}
      {delGroup && (
        <Dialog open onOpenChange={() => setDelGroup(null)}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              Excluir o grupo <strong>{delGroup.name}</strong>? Os usuários vinculados perderão o grupo mas não serão excluídos.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDelGroup(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => deleteMut.mutate(delGroup.id)} disabled={deleteMut.isPending}>
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
