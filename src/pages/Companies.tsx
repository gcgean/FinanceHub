import { useState } from "react";
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
import { mockCompanies, planLabels, type Company } from "@/data/mockAdminData";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj.includes(searchTerm)
  );

  const getStatusBadge = (status: Company['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/10 text-success"><CheckCircle className="w-3 h-3 mr-1" /> Ativo</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Inativo</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  const getPlanBadge = (plan: Company['plan']) => {
    const colors = {
      basic: 'bg-muted text-muted-foreground',
      professional: 'bg-primary/10 text-primary',
      enterprise: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    };
    return <Badge className={colors[plan]}>{planLabels[plan]}</Badge>;
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
        <Dialog open={isAddingNew} onOpenChange={setIsAddingNew}>
          <DialogTrigger asChild>
            <Button>
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
                <Input placeholder="Nome da empresa" />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input placeholder="00.000.000/0000-00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input placeholder="contato@empresa.com" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select defaultValue="professional">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="professional">Profissional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => setIsAddingNew(false)}>
                Cadastrar Empresa
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total de Empresas</p>
          <p className="text-2xl font-bold text-foreground">{companies.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Empresas Ativas</p>
          <p className="text-2xl font-bold text-success">{companies.filter(c => c.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pendências Totais</p>
          <p className="text-2xl font-bold text-warning">{companies.reduce((acc, c) => acc + c.pendingCount, 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Transações no Mês</p>
          <p className="text-2xl font-bold text-foreground">{companies.reduce((acc, c) => acc + c.transactionsCount, 0).toLocaleString()}</p>
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
            {filteredCompanies.map(company => (
              <TableRow key={company.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{company.name}</p>
                      <p className="text-xs text-muted-foreground">{company.cnpj}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="w-3 h-3" /> {company.email}
                    </p>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="w-3 h-3" /> {company.phone}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{getPlanBadge(company.plan)}</TableCell>
                <TableCell>{getStatusBadge(company.status)}</TableCell>
                <TableCell className="text-right font-medium">
                  {company.transactionsCount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {company.pendingCount > 0 ? (
                    <Badge variant="outline" className="text-warning border-warning">
                      {company.pendingCount}
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
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
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
    </div>
  );
}
