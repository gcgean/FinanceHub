import { useState } from "react";
import { 
  Settings as SettingsIcon, Building2, Bell, Lock, Palette, 
  Database, CreditCard, Users, Check, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SettingSection {
  id: string;
  icon: typeof SettingsIcon;
  title: string;
  description: string;
}

const sections: SettingSection[] = [
  { id: 'company', icon: Building2, title: 'Dados da Empresa', description: 'Informações do escritório de BPO' },
  { id: 'notifications', icon: Bell, title: 'Notificações', description: 'Configurar alertas e e-mails' },
  { id: 'security', icon: Lock, title: 'Segurança', description: 'Senhas e autenticação' },
  { id: 'appearance', icon: Palette, title: 'Aparência', description: 'Tema e personalização' },
  { id: 'integrations', icon: Database, title: 'Integrações', description: 'APIs e conexões externas' },
  { id: 'billing', icon: CreditCard, title: 'Faturamento', description: 'Planos e pagamentos' },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState('company');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
        <p className="text-muted-foreground">
          Gerencie as preferências do sistema
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 shrink-0">
          <nav className="space-y-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                  activeSection === section.id 
                    ? "bg-primary/10 text-primary" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <section.icon className="w-5 h-5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{section.title}</p>
                </div>
                {activeSection === section.id && (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {activeSection === 'company' && (
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-6">Dados da Empresa</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Nome do Escritório</Label>
                  <Input defaultValue="FinanceHub BPO" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input defaultValue="12.345.678/0001-90" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input defaultValue="(11) 99999-9999" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>E-mail de Contato</Label>
                  <Input defaultValue="contato@financehub.com.br" />
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input defaultValue="Av. Paulista, 1000 - São Paulo, SP" />
                </div>
                <Separator />
                <Button>Salvar Alterações</Button>
              </div>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-6">Notificações</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">E-mail de pendências</p>
                    <p className="text-sm text-muted-foreground">Receber e-mail quando houver novas pendências</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Alerta de SLA</p>
                    <p className="text-sm text-muted-foreground">Notificar quando pendências estiverem próximas do vencimento</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Resumo diário</p>
                    <p className="text-sm text-muted-foreground">Receber resumo das atividades do dia</p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Insights de IA</p>
                    <p className="text-sm text-muted-foreground">Receber alertas de oportunidades e riscos detectados pela IA</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-6">Segurança</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Senha Atual</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Autenticação de dois fatores</p>
                    <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança</p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <Button>Atualizar Senha</Button>
              </div>
            </Card>
          )}

          {activeSection === 'appearance' && (
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-6">Aparência</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select defaultValue="system">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select defaultValue="pt-BR">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato de Data</Label>
                  <Select defaultValue="dd/MM/yyyy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/MM/yyyy">DD/MM/AAAA</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/DD/AAAA</SelectItem>
                      <SelectItem value="yyyy-MM-dd">AAAA-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'integrations' && (
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-6">Integrações</h3>
              <div className="space-y-4">
                {[
                  { name: 'Banco do Brasil', status: 'connected', type: 'Banco' },
                  { name: 'Itaú Empresas', status: 'connected', type: 'Banco' },
                  { name: 'Nubank', status: 'connected', type: 'Banco' },
                  { name: 'ContaAzul', status: 'disconnected', type: 'ERP' },
                  { name: 'NFe.io', status: 'disconnected', type: 'Nota Fiscal' },
                ].map(integration => (
                  <div key={integration.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{integration.name}</p>
                      <p className="text-sm text-muted-foreground">{integration.type}</p>
                    </div>
                    {integration.status === 'connected' ? (
                      <Button variant="outline" size="sm" className="text-success border-success">
                        <Check className="w-4 h-4 mr-2" /> Conectado
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm">
                        Conectar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSection === 'billing' && (
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-6">Faturamento</h3>
              <div className="space-y-6">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-foreground">Plano Professional</p>
                    <span className="text-primary font-bold text-lg">R$ 299/mês</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Até 10 empresas • 5.000 transações/mês • Suporte prioritário
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="font-medium text-foreground mb-2">Uso do mês atual</p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Empresas</span>
                        <span>5 de 10</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: '50%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Transações</span>
                        <span>3.250 de 5.000</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: '65%' }} />
                      </div>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button variant="outline">Alterar Plano</Button>
                  <Button variant="outline">Histórico de Faturas</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
