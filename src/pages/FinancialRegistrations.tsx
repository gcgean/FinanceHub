import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccountsSection } from "@/components/finance/AccountsSection"
import { CostCentersSection } from "@/components/finance/CostCentersSection"
import { ChartAccountsSection } from "@/components/finance/ChartAccountsSection"
import { CustomersSection } from "@/components/canonical/CustomersSection"
import { SuppliersSection } from "@/components/canonical/SuppliersSection"
import { ProductsSection } from "@/components/canonical/ProductsSection"
import { ApTitlesSection } from "@/components/canonical/ApTitlesSection"
import { ArTitlesSection } from "@/components/canonical/ArTitlesSection"
import { CustomerDeactivationsSection } from "@/components/canonical/CustomerDeactivationsSection"
import { InventorySection } from "@/components/canonical/InventorySection"
import { SalesSection } from "@/components/canonical/SalesSection"

export default function FinancialRegistrations() {
  return (
    <div className="p-6">
      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Contas</TabsTrigger>
          <TabsTrigger value="costCenters">Centros de custo</TabsTrigger>
          <TabsTrigger value="chartAccounts">Plano de contas</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="customerDeactivations">Desativações</TabsTrigger>
          <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="inventory">Estoque</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="apTitles">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="arTitles">Contas a Receber</TabsTrigger>
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

        <TabsContent value="customers">
          <CustomersSection />
        </TabsContent>
        <TabsContent value="customerDeactivations">
          <CustomerDeactivationsSection />
        </TabsContent>

        <TabsContent value="suppliers">
          <SuppliersSection />
        </TabsContent>

        <TabsContent value="products">
          <ProductsSection />
        </TabsContent>
        <TabsContent value="inventory">
          <InventorySection />
        </TabsContent>

        <TabsContent value="sales">
          <SalesSection />
        </TabsContent>

        <TabsContent value="apTitles">
          <ApTitlesSection />
        </TabsContent>

        <TabsContent value="arTitles">
          <ArTitlesSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
