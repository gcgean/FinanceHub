import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Sparkles, Loader2, Play, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiApi, ChatMessage, ChatSession } from "@/api/ai";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";

const suggestedQuestions = [
  "Qual a previsão de faturamento?",
  "Quais são os riscos?",
  "Compare com a meta",
  "Recomendações estratégicas"
];

export function AIChat() {
  const [input, setInput] = useState('');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const companyId = useAuthStore((s) => s.companyId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 1. List Chats to find active session
  const { data: chats, isLoading: isLoadingChats } = useQuery({
    queryKey: ['ai-chats', companyId],
    queryFn: aiApi.listChats,
  });

  // 2. Create Chat Mutation
  const createChatMutation = useMutation({
    mutationFn: () => aiApi.createChat("Nova Conversa"),
    onSuccess: (newChat) => {
      queryClient.setQueryData<ChatSession[] | undefined>(['ai-chats', companyId], (old) => {
        const list = old || [];
        return [newChat, ...list.filter((c) => c.id !== newChat.id)];
      });
      setActiveChatId(newChat.id);
      setIsClearingChat(false);
      queryClient.invalidateQueries({ queryKey: ['ai-chats', companyId] });
    },
    onError: () => {
      setIsClearingChat(false);
    },
  });

  // 3. Initialize Chat
  useEffect(() => {
    setActiveChatId(null);
    queryClient.removeQueries({ queryKey: ['ai-chat'] });
  }, [companyId, queryClient]);

  useEffect(() => {
    if (isLoadingChats || !chats) return;

    if (chats.length === 0) {
      if (!createChatMutation.isPending && !activeChatId) {
        createChatMutation.mutate();
      }
      return;
    }

    if (!activeChatId) {
      if (isClearingChat) return;
      setActiveChatId(chats[0].id);
      return;
    }

    if (chats.some((chat) => chat.id === activeChatId)) return;
    if (isClearingChat) return;
    if (createChatMutation.isPending) return;
    setActiveChatId(chats[0].id);
  }, [chats, isLoadingChats, activeChatId, createChatMutation.isPending, isClearingChat]);

  // 4. Fetch Messages for Active Chat
  const { data: chatSession, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['ai-chat', companyId, activeChatId],
    queryFn: () => aiApi.getChat(activeChatId!),
    enabled: !!activeChatId,
    refetchInterval: 30000, // Poll for updates every 30s (messages handled optimistically)
  });

  // 5. Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ chatId, content }: { chatId: string; content: string }) => 
      aiApi.sendMessage(chatId, content),
    onMutate: async ({ chatId, content }) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['ai-chat', companyId, chatId] });
      const previousChat = queryClient.getQueryData<ChatSession>(['ai-chat', companyId, chatId]);

      queryClient.setQueryData<ChatSession | undefined>(['ai-chat', companyId, chatId], (old) => ({
        ...(old || { id: chatId, title: "Nova Conversa", updatedAt: new Date().toISOString(), messages: [] }),
        messages: [
          ...(old?.messages || []),
          {
            id: 'temp-' + Date.now(),
            role: 'user',
            content,
            createdAt: new Date().toISOString(),
          },
        ],
      }));

      return { previousChat };
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['ai-chat', companyId, activeChatId], context?.previousChat);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-chat', companyId, activeChatId] });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatSession?.messages, sendMessageMutation.isPending]);

  const generateReportMutation = useMutation({
    mutationFn: () => aiApi.generateExecutiveReport(),
    onSuccess: (data) => {
      if (activeChatId) {
        queryClient.setQueryData<ChatSession | undefined>(['ai-chat', companyId, activeChatId], (old) => ({
          ...(old || { id: activeChatId, title: "Nova Conversa", updatedAt: new Date().toISOString(), messages: [] }),
          messages: [
            ...(old?.messages || []),
            {
              id: 'temp-' + Date.now(),
              role: 'user',
              content: "Gerar relatório executivo",
              createdAt: new Date().toISOString(),
            },
            {
              id: 'temp-res-' + Date.now(),
              role: 'assistant',
              content: data.relatorio,
              createdAt: new Date().toISOString(),
            }
          ],
        }));
      }
    }
  });

  const generateAlertsMutation = useMutation({
    mutationFn: () => aiApi.generateAlerts(),
    onSuccess: (data) => {
      if (activeChatId) {
        queryClient.setQueryData<ChatSession | undefined>(['ai-chat', companyId, activeChatId], (old) => ({
          ...(old || { id: activeChatId, title: "Nova Conversa", updatedAt: new Date().toISOString(), messages: [] }),
          messages: [
            ...(old?.messages || []),
            {
              id: 'temp-' + Date.now(),
              role: 'user',
              content: "Ver alertas críticos",
              createdAt: new Date().toISOString(),
            },
            {
              id: 'temp-res-' + Date.now(),
              role: 'assistant',
              content: data.alertas,
              createdAt: new Date().toISOString(),
            }
          ],
        }));
      }
    }
  });

  const handleSend = (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || !activeChatId) return;

    setInput('');
    sendMessageMutation.mutate({ chatId: activeChatId, content: messageText });
  };

  const messages = isClearingChat ? [] : (chatSession?.messages || []);
  const isTyping = sendMessageMutation.isPending;

  // Função para renderizar conteúdo especial (como tasks)
  const renderMessageContent = (content: string) => {
    // Detectar padrão de tarefa criada no texto
    if (content.includes("Iniciei uma tarefa de")) {
      const parts = content.split("Iniciei uma tarefa de");
      const prefix = parts[0];
      const suffix = "Iniciei uma tarefa de" + parts[1];
      
      return (
        <div className="space-y-2">
          <p>{prefix}</p>
          <div className="bg-background/50 p-3 rounded-lg border border-border flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
              <Play className="w-4 h-4 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="font-medium text-sm">Tarefa em Execução</p>
              <p className="text-xs text-muted-foreground">O processamento ocorrerá em segundo plano.</p>
            </div>
            <Badge variant="outline" className="ml-auto">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Processando
            </Badge>
          </div>
        </div>
      );
    }

    return (
      <div className="text-sm whitespace-pre-wrap">
        {content.split('\n').map((line, i) => (
          <p key={i} className={line.startsWith('**') ? 'font-semibold' : ''}>
            {line.replace(/\*\*/g, '')}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[600px] rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Assistente IA Financeiro</h3>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <p className="text-xs text-muted-foreground">
                {isLoadingChats ? "Carregando..." : activeChatId ? "Online" : "Iniciando..."}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => generateReportMutation.mutate()}
            disabled={generateReportMutation.isPending || isTyping}
          >
            {generateReportMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Gerar Relatório
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => generateAlertsMutation.mutate()}
            disabled={generateAlertsMutation.isPending || isTyping}
          >
            {generateAlertsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
            Ver Alertas
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setIsClearingChat(true);
              setActiveChatId(null);
              createChatMutation.mutate();
            }}
            disabled={createChatMutation.isPending}
            className="text-muted-foreground hover:text-foreground"
          >
            Limpar
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message: ChatMessage) => (
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
                {message.content.includes("Iniciei uma tarefa de") ? renderMessageContent(message.content) : (
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content.split('\n').map((line, i) => (
                      <p key={i} className={line.startsWith('**') ? 'font-semibold' : ''}>
                        {line.replace(/\*\*/g, '')}
                      </p>
                    ))}
                  </div>
                )}
                <span className="text-[10px] opacity-70 mt-1 block text-right">
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted text-foreground max-w-[80%] rounded-2xl px-4 py-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
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
              disabled={isTyping || !activeChatId}
              className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors disabled:opacity-50"
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
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 4000))}
              placeholder="Pergunte sobre seu negócio..."
              className="flex-1 w-full"
              disabled={isTyping || !activeChatId}
              maxLength={4000}
            />
            {input.length > 3800 && (
              <span className="absolute right-2 bottom-[-18px] text-[10px] text-muted-foreground">
                {input.length}/4000
              </span>
            )}
          </div>
          <Button type="submit" size="icon" disabled={!input.trim() || isTyping || !activeChatId}>
            {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
