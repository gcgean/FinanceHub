import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Sparkles, Loader2, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiApi, ChatMessage, ChatSession } from "@/api/ai";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const suggestedQuestions = [
  "Qual a previsão de faturamento?",
  "Faça uma análise profunda",
  "Categorizar lançamentos",
  "Como está a saúde financeira da empresa?",
];

export function AIChat() {
  const [input, setInput] = useState('');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 1. List Chats to find active session
  const { data: chats, isLoading: isLoadingChats } = useQuery({
    queryKey: ['ai-chats'],
    queryFn: aiApi.listChats,
  });

  // 2. Create Chat Mutation
  const createChatMutation = useMutation({
    mutationFn: () => aiApi.createChat("Nova Conversa"),
    onSuccess: (newChat) => {
      setActiveChatId(newChat.id);
      queryClient.invalidateQueries({ queryKey: ['ai-chats'] });
    },
  });

  // 3. Initialize Chat
  useEffect(() => {
    if (!isLoadingChats && chats) {
      if (chats.length > 0) {
        setActiveChatId(chats[0].id);
      } else if (!activeChatId && !createChatMutation.isPending) {
        createChatMutation.mutate();
      }
    }
  }, [chats, isLoadingChats, activeChatId, createChatMutation]);

  // 4. Fetch Messages for Active Chat
  const { data: chatSession, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['ai-chat', activeChatId],
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
      await queryClient.cancelQueries({ queryKey: ['ai-chat', chatId] });
      const previousChat = queryClient.getQueryData<ChatSession>(['ai-chat', chatId]);

      queryClient.setQueryData<ChatSession | undefined>(['ai-chat', chatId], (old) => ({
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
      queryClient.setQueryData(['ai-chat', activeChatId], context?.previousChat);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-chat', activeChatId] });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatSession?.messages, sendMessageMutation.isPending]);

  const handleSend = (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || !activeChatId) return;

    setInput('');
    sendMessageMutation.mutate({ chatId: activeChatId, content: messageText });
  };

  const messages = chatSession?.messages || [];
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
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Assistente IA Financeiro</h3>
          <p className="text-xs text-muted-foreground">
            {isLoadingChats ? "Carregando..." : activeChatId ? "Conectado" : "Iniciando..."}
          </p>
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
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
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
