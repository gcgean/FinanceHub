import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, Plug, Camera, ListTodo } from "lucide-react";
import { ExcelUpload } from "@/components/imports/ExcelUpload";
import { APIConnection } from "@/components/imports/APIConnection";
import { ReceiptUpload } from "@/components/imports/ReceiptUpload";
import { ImportQueue } from "@/components/imports/ImportQueue";

export default function Imports() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Central de Importações</h2>
        <p className="text-muted-foreground mt-1">
          Importe dados de múltiplas fontes e deixe a IA analisar automaticamente
        </p>
      </div>

      <Tabs defaultValue="queue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <ListTodo className="w-4 h-4" />
            <span className="hidden sm:inline">Fila de Análise</span>
            <span className="sm:hidden">Fila</span>
          </TabsTrigger>
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Comprovantes</span>
            <span className="sm:hidden">Fotos</span>
          </TabsTrigger>
          <TabsTrigger value="excel" className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Plug className="w-4 h-4" />
            <span>API</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-6">
          <ImportQueue />
        </TabsContent>

        <TabsContent value="receipts" className="mt-6">
          <ReceiptUpload />
        </TabsContent>

        <TabsContent value="excel" className="mt-6">
          <ExcelUpload />
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <APIConnection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
