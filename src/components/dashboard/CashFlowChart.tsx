import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { date: "01/01", income: 45000, expense: 32000, balance: 13000 },
  { date: "08/01", income: 52000, expense: 38000, balance: 27000 },
  { date: "15/01", income: 48000, expense: 35000, balance: 40000 },
  { date: "22/01", income: 61000, expense: 42000, balance: 59000 },
  { date: "29/01", income: 55000, expense: 39000, balance: 75000 },
];

export function CashFlowChart() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
      <div className="mb-6">
        <h3 className="font-semibold text-foreground">Fluxo de Caixa</h3>
        <p className="text-sm text-muted-foreground">Janeiro 2026</p>
      </div>

      <div className="flex items-center gap-6 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-sm text-muted-foreground">Entradas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-sm text-muted-foreground">Saídas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">Saldo</span>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217, 91%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: "hsl(220, 10%, 46%)", fontSize: 12 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: "hsl(220, 10%, 46%)", fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(220, 13%, 91%)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value: number) => [
                value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
              ]}
            />
            <Area 
              type="monotone" 
              dataKey="income" 
              stroke="hsl(142, 76%, 36%)" 
              strokeWidth={2}
              fill="url(#colorIncome)" 
              name="Entradas"
            />
            <Area 
              type="monotone" 
              dataKey="expense" 
              stroke="hsl(0, 72%, 51%)" 
              strokeWidth={2}
              fill="url(#colorExpense)" 
              name="Saídas"
            />
            <Area 
              type="monotone" 
              dataKey="balance" 
              stroke="hsl(217, 91%, 50%)" 
              strokeWidth={2}
              fill="url(#colorBalance)" 
              name="Saldo"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}