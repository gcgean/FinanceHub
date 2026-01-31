import { useState } from "react";
import { Brain, Sparkles, FileText, MessageSquare, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PredictiveMetricCard } from "@/components/ai/PredictiveMetricCard";
import { AIInsightCard } from "@/components/ai/AIInsightCard";
import { ChurnRiskTable } from "@/components/ai/ChurnRiskTable";
import { OpportunitiesTable } from "@/components/ai/OpportunitiesTable";
import { RevenueChart } from "@/components/ai/RevenueChart";
import { AIChat } from "@/components/ai/AIChat";
import { HorizonSelector } from "@/components/ai/HorizonSelector";
import { 
  predictiveMetrics, 
  aiInsights, 
  churnRisks, 
  opportunities 
} from "@/data/mockAIData";

export default function AIInsights() {
  const [horizon, setHorizon] = useState<'30d' | '90d' | '12m'>('30d');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inteligência Artificial</h1>
            <p className="text-muted-foreground">Insights preditivos e análise de mercado</p>
          </div>
        </div>
        <HorizonSelector value={horizon} onChange={setHorizon} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Dashboard Preditivo
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat com IA
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="w-4 h-4" />
            Relatórios Automáticos
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Predictive Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {predictiveMetrics.map((metric, i) => (
              <PredictiveMetricCard key={i} metric={metric} horizon={horizon} />
            ))}
          </div>

          {/* Revenue Chart */}
          <RevenueChart />

          {/* AI Insights */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Insights da IA</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiInsights.map((insight) => (
                <AIInsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>

          {/* Churn Risks */}
          <ChurnRiskTable risks={churnRisks} />

          {/* Opportunities */}
          <OpportunitiesTable opportunities={opportunities} />
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <div className="max-w-4xl mx-auto">
            <AIChat />
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { 
                title: 'Relatório Semanal de Performance', 
                desc: 'Análise completa de KPIs, tendências e recomendações',
                date: '31/01/2026',
                status: 'Gerado'
              },
              { 
                title: 'Análise de Churn Mensal', 
                desc: 'Clientes em risco, ações de retenção e impacto financeiro',
                date: '31/01/2026',
                status: 'Gerado'
              },
              { 
                title: 'Oportunidades de Vendas', 
                desc: 'Pipeline qualificado, upsell e cross-sell identificados',
                date: '31/01/2026',
                status: 'Gerado'
              },
              { 
                title: 'Forecast Q1 2026', 
                desc: 'Projeção de receita, custos e resultado para o trimestre',
                date: '30/01/2026',
                status: 'Gerado'
              },
              { 
                title: 'Análise de Sazonalidade', 
                desc: 'Padrões históricos e previsão de picos de demanda',
                date: '28/01/2026',
                status: 'Gerado'
              },
              { 
                title: 'Relatório de Inadimplência', 
                desc: 'Análise de contas a receber e ações de cobrança',
                date: '27/01/2026',
                status: 'Gerado'
              },
            ].map((report, i) => (
              <div 
                key={i} 
                className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">{report.date}</span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{report.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{report.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">
                    {report.status}
                  </span>
                  <button className="text-sm text-primary hover:underline">
                    Visualizar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Auto-generation settings */}
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <h3 className="font-semibold text-foreground mb-2">Configurações de Geração Automática</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Relatórios são gerados automaticamente com base nos dados mais recentes.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="weekly" defaultChecked className="rounded" />
                <label htmlFor="weekly" className="text-sm text-foreground">Semanal (segunda-feira)</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="monthly" defaultChecked className="rounded" />
                <label htmlFor="monthly" className="text-sm text-foreground">Mensal (dia 1)</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="alerts" defaultChecked className="rounded" />
                <label htmlFor="alerts" className="text-sm text-foreground">Alertas em tempo real</label>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
