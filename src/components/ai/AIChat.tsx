import { useState } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChatMessage, sampleChatHistory, suggestedQuestions } from "@/data/mockAIData";

const mockResponses: Record<string, string> = {
  'churn': `📊 **Análise de Churn - Janeiro 2026**

Identifiquei **3 clientes em risco crítico** de cancelamento:

1. **Tech Solutions Ltda** - Risco 78%
   - Valor em risco: R$ 4.500/mês
   - Motivo: Reduziu interações em 60%
   - Ação: Contato urgente do CS

2. **Comercial ABC** - Risco 65%
   - Valor em risco: R$ 2.800/mês
   - Motivo: Ticket sem resolução há 20 dias
   - Ação: Priorizar resolução do chamado

3. **Indústria Norte** - Risco 45%
   - Valor em risco: R$ 8.200/mês
   - Motivo: Solicitou info sobre cancelamento
   - Ação: Agendar reunião de retenção

**Impacto total potencial: R$ 186.000/ano**

Recomendo priorizar ações de retenção esta semana.`,

  'faturamento': `📈 **Previsão de Faturamento - Próximos 3 meses**

Com base no histórico e tendências identificadas:

| Período | Previsão | Confiança |
|---------|----------|-----------|
| Fev/26 | R$ 278.000 | 85% |
| Mar/26 | R$ 295.000 | 78% |
| Abr/26 | R$ 312.000 | 72% |

**Fatores considerados:**
- ✅ Sazonalidade: pico histórico em março (+25%)
- ✅ Pipeline de vendas: 12 oportunidades qualificadas
- ⚠️ Risco de churn: 3 clientes críticos
- ✅ Tendência MRR: crescimento de 5% ao mês

**Cenário otimista:** R$ 340.000 em abril
**Cenário pessimista:** R$ 275.000 em abril

A previsão considera retenção dos clientes em risco.`,

  'oportunidades': `💡 **Top Oportunidades de Vendas**

Identifiquei **5 oportunidades** com alto potencial:

🥇 **Distribuidora Sul** - Upsell
   - Produto: Plano Enterprise
   - Potencial: +R$ 15.000/mês
   - Probabilidade: 82%
   - Próximo passo: Demo do módulo avançado

🥈 **Grupo Atacado** - Cross-sell
   - Produto: Módulo Conciliação
   - Potencial: +R$ 8.500/mês
   - Probabilidade: 75%
   - Próximo passo: Apresentar ROI

🥉 **Rede Farmácias** - Expansão
   - Produto: 3 novas licenças
   - Potencial: +R$ 12.000/mês
   - Probabilidade: 68%
   - Próximo passo: Contato sobre filiais

**Potencial total: R$ 45.300/mês adicional**

Recomendo focar nas 3 primeiras esta semana.`,

  'saude': `🏥 **Saúde Financeira - Resumo Executivo**

**Indicadores Principais:**
- 💰 Faturamento: R$ 261.000 (+12% vs mês anterior)
- 📊 MRR: R$ 62.000 (+6.8% vs mês anterior)
- 📉 Churn Rate: 4.2% (meta: <3%)
- ⚠️ Inadimplência: 12% (acima da média do setor)

**Pontos Fortes:**
✅ Crescimento consistente de receita recorrente
✅ 12 oportunidades qualificadas no pipeline
✅ Ticket médio aumentou 8% no trimestre

**Pontos de Atenção:**
⚠️ Taxa de churn acima da meta
⚠️ 3 clientes em risco crítico (R$ 186k/ano)
⚠️ Inadimplência precisa de ação

**Score Geral: 7.2/10** 📊

Empresa em crescimento saudável, mas precisa focar em retenção e cobrança.`,

  'priorizar': `📋 **Prioridades da Semana - 31/Jan a 06/Fev**

**🔴 URGENTE (fazer hoje):**
1. Contatar Tech Solutions sobre risco de churn
   - Valor em risco: R$ 54.000/ano
   - Responsável: CS Team

2. Resolver ticket da Comercial ABC
   - Aberto há 20 dias
   - Impacto: Satisfação do cliente

**🟡 IMPORTANTE (esta semana):**
3. Agendar demo Distribuidora Sul
   - Oportunidade: R$ 15.000/mês
   - Probabilidade alta: 82%

4. Revisar política de cobrança
   - Inadimplência em 12%
   - Meta: reduzir para 7%

**🟢 PLANEJADO (próximas 2 semanas):**
5. Preparar campanha março (sazonalidade)
6. Contatar leads de expansão
7. Atualizar forecast Q1

**Foco da semana: Retenção + Oportunidade prioritária**`,
};

export function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(sampleChatHistory);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const getAIResponse = (question: string): string => {
    const q = question.toLowerCase();
    if (q.includes('churn') || q.includes('cancelamento') || q.includes('risco')) {
      return mockResponses['churn'];
    }
    if (q.includes('faturamento') || q.includes('previsão') || q.includes('receita') || q.includes('projeção')) {
      return mockResponses['faturamento'];
    }
    if (q.includes('oportunidade') || q.includes('vendas') || q.includes('upsell')) {
      return mockResponses['oportunidades'];
    }
    if (q.includes('saúde') || q.includes('saude') || q.includes('situação') || q.includes('como está')) {
      return mockResponses['saude'];
    }
    if (q.includes('priorizar') || q.includes('prioridade') || q.includes('semana') || q.includes('fazer')) {
      return mockResponses['priorizar'];
    }
    return `Analisei sua pergunta sobre "${question}". 

Com base nos dados disponíveis:
- **Faturamento atual:** R$ 261.000
- **MRR:** R$ 62.000
- **Clientes ativos:** 47
- **Crescimento:** +12% vs mês anterior

Para uma análise mais específica, você pode perguntar sobre:
- Previsão de faturamento
- Riscos de churn
- Oportunidades de vendas
- Saúde financeira geral`;
  };

  const handleSend = (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getAIResponse(messageText),
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[600px] rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Assistente IA Financeiro</h3>
          <p className="text-xs text-muted-foreground">Análises em tempo real do seu negócio</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' && "flex-row-reverse"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                message.role === 'assistant' ? "bg-primary/10" : "bg-muted"
              )}>
                {message.role === 'assistant' ? (
                  <Bot className="w-4 h-4 text-primary" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                message.role === 'assistant' 
                  ? "bg-muted text-foreground" 
                  : "bg-primary text-primary-foreground"
              )}>
                <div className="text-sm whitespace-pre-wrap">
                  {message.content.split('\n').map((line, i) => (
                    <p key={i} className={line.startsWith('**') ? 'font-semibold' : ''}>
                      {line.replace(/\*\*/g, '')}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Suggested Questions */}
      <div className="px-4 py-2 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">Sugestões:</p>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.slice(0, 3).map((question, i) => (
            <button
              key={i}
              onClick={() => handleSend(question)}
              className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre seu negócio..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isTyping}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
