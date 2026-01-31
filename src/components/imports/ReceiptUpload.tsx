import { useState, useRef, useCallback } from "react";
import { Camera, Upload, Image, X, CheckCircle, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface UploadedReceipt {
  id: string;
  name: string;
  imageUrl: string;
  status: 'uploading' | 'processing' | 'analyzed' | 'error';
  uploadedAt: Date;
  aiAnalysis?: {
    confidence: number;
    suggestedCategory: string;
    suggestedValue: number;
    suggestedDate: string;
    suggestedDescription: string;
  };
}

export function ReceiptUpload() {
  const [receipts, setReceipts] = useState<UploadedReceipt[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<UploadedReceipt | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const simulateAIAnalysis = (receiptId: string) => {
    // Simulate processing
    setTimeout(() => {
      setReceipts(prev => 
        prev.map(r => 
          r.id === receiptId 
            ? { ...r, status: 'processing' as const }
            : r
        )
      );
    }, 500);

    // Simulate AI analysis complete
    setTimeout(() => {
      const mockAnalysis = {
        confidence: Math.floor(Math.random() * 20) + 80, // 80-100%
        suggestedCategory: ['Despesas Operacionais', 'Material de Escritório', 'Energia Elétrica', 'Telefonia'][Math.floor(Math.random() * 4)],
        suggestedValue: Math.floor(Math.random() * 5000) + 100,
        suggestedDate: new Date().toISOString().split('T')[0],
        suggestedDescription: 'Comprovante identificado pela IA',
      };

      setReceipts(prev => 
        prev.map(r => 
          r.id === receiptId 
            ? { ...r, status: 'analyzed' as const, aiAnalysis: mockAnalysis }
            : r
        )
      );
    }, 2500);
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );

    imageFiles.forEach(file => {
      const receipt: UploadedReceipt = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        imageUrl: URL.createObjectURL(file),
        status: 'uploading',
        uploadedAt: new Date(),
      };

      setReceipts(prev => [...prev, receipt]);
      simulateAIAnalysis(receipt.id);
    });
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeReceipt = (id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50"
        )}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
            isDragging ? "bg-primary/10" : "bg-muted"
          )}>
            <Image className={cn(
              "w-8 h-8",
              isDragging ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <p className="font-medium text-foreground">
              Envie fotos de comprovantes
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              A IA irá analisar e extrair as informações automaticamente
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="w-4 h-4 mr-2" />
              Tirar Foto
            </Button>
            <Button 
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Selecionar Arquivo
            </Button>
          </div>
        </div>
      </div>

      {/* Uploaded Receipts Grid */}
      {receipts.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-foreground">Comprovantes Enviados</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {receipts.map(receipt => (
              <Card key={receipt.id} className="overflow-hidden">
                {/* Image Preview */}
                <div 
                  className="relative h-40 bg-muted cursor-pointer"
                  onClick={() => setPreviewReceipt(receipt)}
                >
                  <img 
                    src={receipt.imageUrl} 
                    alt={receipt.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white opacity-0 hover:opacity-100 transition-opacity" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeReceipt(receipt.id);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {/* Status Badge */}
                  <div className="absolute bottom-2 left-2">
                    <Badge 
                      variant={
                        receipt.status === 'analyzed' ? 'default' :
                        receipt.status === 'processing' ? 'secondary' : 'outline'
                      }
                      className={cn(
                        receipt.status === 'analyzed' && "bg-success/90 hover:bg-success"
                      )}
                    >
                      {receipt.status === 'uploading' && (
                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Enviando</>
                      )}
                      {receipt.status === 'processing' && (
                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analisando</>
                      )}
                      {receipt.status === 'analyzed' && (
                        <><CheckCircle className="w-3 h-3 mr-1" /> Analisado</>
                      )}
                    </Badge>
                  </div>
                </div>
                
                {/* AI Analysis Results */}
                <div className="p-4">
                  <p className="font-medium text-foreground text-sm truncate">{receipt.name}</p>
                  {receipt.aiAnalysis ? (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Categoria:</span>
                        <span className="font-medium text-foreground">{receipt.aiAnalysis.suggestedCategory}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="font-medium text-foreground">{formatCurrency(receipt.aiAnalysis.suggestedValue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Confiança:</span>
                        <span className={cn(
                          "font-medium",
                          receipt.aiAnalysis.confidence >= 90 ? "text-success" :
                          receipt.aiAnalysis.confidence >= 70 ? "text-warning" : "text-destructive"
                        )}>
                          {receipt.aiAnalysis.confidence}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">
                      Aguardando análise da IA...
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewReceipt} onOpenChange={() => setPreviewReceipt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewReceipt?.name}</DialogTitle>
          </DialogHeader>
          {previewReceipt && (
            <div className="space-y-4">
              <img 
                src={previewReceipt.imageUrl} 
                alt={previewReceipt.name}
                className="w-full rounded-lg"
              />
              {previewReceipt.aiAnalysis && (
                <Card className="p-4 bg-muted/50">
                  <h4 className="font-medium text-foreground mb-3">Análise da IA</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Categoria Sugerida:</span>
                      <p className="font-medium text-foreground">{previewReceipt.aiAnalysis.suggestedCategory}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valor Identificado:</span>
                      <p className="font-medium text-foreground">{formatCurrency(previewReceipt.aiAnalysis.suggestedValue)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data:</span>
                      <p className="font-medium text-foreground">{previewReceipt.aiAnalysis.suggestedDate}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Confiança:</span>
                      <p className={cn(
                        "font-medium",
                        previewReceipt.aiAnalysis.confidence >= 90 ? "text-success" :
                        previewReceipt.aiAnalysis.confidence >= 70 ? "text-warning" : "text-destructive"
                      )}>
                        {previewReceipt.aiAnalysis.confidence}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button className="flex-1">Aprovar e Lançar</Button>
                    <Button variant="outline" className="flex-1">Editar Dados</Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Instructions */}
      <Card className="p-4 bg-muted/50">
        <h4 className="font-medium text-foreground mb-2">Como funciona</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>1. Tire uma foto ou selecione um arquivo do comprovante</li>
          <li>2. A IA irá analisar e extrair: data, valor, descrição e categoria</li>
          <li>3. Revise os dados e aprove para lançar automaticamente</li>
          <li>4. Itens com baixa confiança vão para a fila de pendências</li>
        </ul>
      </Card>
    </div>
  );
}
