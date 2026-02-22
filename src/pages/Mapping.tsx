import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Mapping() {
  const [entity, setEntity] = useState("PRODUCT");
  const [left, setLeft] = useState<string[]>(["externalProductId", "name", "barcode", "category", "brand"]);
  const [right, setRight] = useState<string[]>(["sku", "name", "barcode", "categoryPath", "brandName"]);

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Mapeamento de Campos</h2>
      <div className="flex items-center gap-2">
        <Input value={entity} onChange={(e) => setEntity(e.target.value)} />
        <Button variant="secondary">Detectar campos</Button>
        <Button>Salvar mapeamento</Button>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded border">
          <div className="p-3 border-b font-medium">Payload detectado</div>
          <ul className="p-3 space-y-2">
            {left.map((n) => (
              <li key={n} className="flex items-center justify-between">
                <span>{n}</span>
                <Button variant="outline" size="sm">Mapear</Button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded border">
          <div className="p-3 border-b font-medium">Destino (STG/Canônico)</div>
          <ul className="p-3 space-y-2">
            {right.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
