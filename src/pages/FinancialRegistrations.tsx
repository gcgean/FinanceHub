import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccountsSection } from "@/components/finance/AccountsSection"
import { CostCentersSection } from "@/components/finance/CostCentersSection"
import { ChartAccountsSection } from "@/components/finance/ChartAccountsSection"

export default function FinancialRegistrations() {
  return (
    <div className="p-6">
      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Contas</TabsTrigger>
          <TabsTrigger value="costCenters">Centros de custo</TabsTrigger>
          <TabsTrigger value="chartAccounts">Plano de contas</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <AccountsSection />
        </TabsContent>

        <TabsContent value="costCenters">
          <CostCentersSection />
        </TabsContent>

        <TabsContent value="chartAccounts">
          <ChartAccountsSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

