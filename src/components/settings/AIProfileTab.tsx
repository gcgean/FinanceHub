import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiApi, AIProfile } from "@/api/ai";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Brain } from "lucide-react";

export function AIProfileTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Local state for form
  const [tone, setTone] = useState("formal");
  const [level, setLevel] = useState("summary");
  const [segment, setSegment] = useState("GENERIC");
  const [aiProvider, setAiProvider] = useState("openai");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");

  const [isTesting, setIsTesting] = useState(false);

  // Fetch current profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['ai-profile'],
    queryFn: aiApi.getProfile,
  });

  // Update local state when data loads
  useEffect(() => {
    if (profile) {
      setTone(profile.tone);
      setLevel(profile.level);
      setSegment(profile.segment || "GENERIC");
      setAiProvider(profile.aiProvider || "openai");
      setOpenaiApiKey(profile.openaiApiKey || "");
      setAnthropicApiKey(profile.anthropicApiKey || "");
      setGeminiApiKey(profile.geminiApiKey || "");
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: aiApi.updateProfile,
    onSuccess: () => {
      toast({ title: "Perfil de IA atualizado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ['ai-profile'] });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar perfil", variant: "destructive" });
    }
  });

  const handleSave = () => {
    updateMutation.mutate({ tone, level, segment, aiProvider, openaiApiKey, anthropicApiKey, geminiApiKey });
  };

  const handleTestConnection = async () => {
    let keyToTest = "";
    if (aiProvider === "openai") keyToTest = openaiApiKey;
    if (aiProvider === "anthropic") keyToTest = anthropicApiKey;
    if (aiProvider === "gemini") keyToTest = geminiApiKey;

    if (!keyToTest) {
      toast({ title: "Por favor, insira uma chave para testar.", variant: "destructive" });
      return;
    }

    setIsTesting(true);
    try {
      const result = await aiApi.testConnection(aiProvider, keyToTest);
      if (result.success) {
        toast({ title: "Conexão bem sucedida!", description: result.message });
      } else {
        toast({ title: "Falha na conexão", description: result.message, variant: "destructive" });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({ title: "Erro ao testar conexão", description: message, variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <CardTitle>Comportamento da IA</CardTitle>
        </div>
        <CardDescription>
          Personalize como o assistente virtual interage e analisa seus dados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="space-y-2">
          <Label>Tom de Voz</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="formal">Formal e Executivo (Recomendado)</SelectItem>
              <SelectItem value="casual">Casual e Direto</SelectItem>
              <SelectItem value="technical">Técnico e Detalhado</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Define a formalidade das respostas no chat e nos insights gerados.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Nível de Detalhe</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Resumido (Foco em Highlights)</SelectItem>
              <SelectItem value="detailed">Detalhado (Explicar causas raiz)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Define se a IA deve priorizar síntese ou explicação profunda.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Segmento de Negócio</Label>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERIC">Genérico / Outros</SelectItem>
              <SelectItem value="SOFTWARE">Empresa de Software / SaaS</SelectItem>
              <SelectItem value="RETAIL">Varejo / Supermercado</SelectItem>
              <SelectItem value="INDUSTRY">Indústria</SelectItem>
              <SelectItem value="SERVICES">Serviços</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Ajuda a IA a selecionar as regras de insight mais relevantes para o seu setor.
          </p>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <Label>Provedor de IA Principal</Label>
          <Select value={aiProvider} onValueChange={setAiProvider}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o provedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
              <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
              <SelectItem value="gemini">Google (Gemini)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Selecione qual inteligência artificial o sistema deve usar como principal.
          </p>
        </div>

        {aiProvider === 'openai' && (
          <div className="space-y-2">
            <Label>Chave de API (OpenAI)</Label>
            <Input 
              type="password" 
              placeholder="sk-..." 
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Insira sua chave de API da OpenAI. Deixe em branco para usar a chave padrão do servidor.
            </p>
          </div>
        )}

        {aiProvider === 'anthropic' && (
          <div className="space-y-2">
            <Label>Chave de API (Anthropic Claude)</Label>
            <Input 
              type="password" 
              placeholder="sk-ant-..." 
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Insira sua chave de API da Anthropic. Deixe em branco para usar a chave padrão do servidor.
            </p>
          </div>
        )}

        {aiProvider === 'gemini' && (
          <div className="space-y-2">
            <Label>Chave de API (Google Gemini)</Label>
            <Input 
              type="password" 
              placeholder="AIza..." 
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Insira sua chave de API do Google Gemini. Deixe em branco para usar a chave padrão do servidor.
            </p>
          </div>
        )}

        <div className="pt-4 flex justify-between items-center border-t mt-4">
          <Button type="button" variant="outline" onClick={handleTestConnection} disabled={isTesting}>
            {isTesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Testar Conexão
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Preferências
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
