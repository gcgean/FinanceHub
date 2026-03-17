import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesTab } from "./SalesTab";
import { SaleItemsTab } from "./SaleItemsTab";
import { PaymentMethodsTab } from "./PaymentMethodsTab";
import { SellersTab } from "./SellersTab";
import { CashiersTab } from "./CashiersTab";

export function SalesSection() {
  return (
    <Tabs defaultValue="sales">
      <TabsList>
        <TabsTrigger value="sales">Vendas</TabsTrigger>
        <TabsTrigger value="sale-items">Itens de Venda</TabsTrigger>
        <TabsTrigger value="payment-methods">Formas de Pagamento</TabsTrigger>
        <TabsTrigger value="sellers">Vendedores</TabsTrigger>
        <TabsTrigger value="cashiers">Caixas</TabsTrigger>
      </TabsList>
      <TabsContent value="sales">
        <SalesTab />
      </TabsContent>
      <TabsContent value="sale-items">
        <SaleItemsTab />
      </TabsContent>
      <TabsContent value="payment-methods">
        <PaymentMethodsTab />
      </TabsContent>
      <TabsContent value="sellers">
        <SellersTab />
      </TabsContent>
      <TabsContent value="cashiers">
        <CashiersTab />
      </TabsContent>
    </Tabs>
  )
}
