import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesTab } from "./SalesTab";
import { SaleItemsTab } from "./SaleItemsTab";
import { PaymentMethodsTab } from "./PaymentMethodsTab";

export function SalesSection() {
  return (
    <Tabs defaultValue="sales">
      <TabsList>
        <TabsTrigger value="sales">Vendas</TabsTrigger>
        <TabsTrigger value="sale-items">Itens de Venda</TabsTrigger>
        <TabsTrigger value="payment-methods">Formas de Pagamento</TabsTrigger>
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
    </Tabs>
  )
}
