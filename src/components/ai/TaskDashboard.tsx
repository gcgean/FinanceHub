import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiApi, AITask } from "@/api/ai";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Clock, Play, BarChart, Tag } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function TaskDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['ai-tasks'],
    queryFn: aiApi.listTasks,
    refetchInterval: 3000, // Poll every 3s to see updates
  });

  const createTaskMutation = useMutation({
    mutationFn: (type: string) => aiApi.createTask(type), // We need to add this method to api/ai.ts
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tasks'] });
      toast({ title: "Tarefa iniciada", description: "O processamento ocorrerá em segundo plano." });
    },
    onError: () => {
      toast({ title: "Erro ao criar tarefa", variant: "destructive" });
    }
  });

  const handleCreateTask = (type: string) => {
    // For now we assume api/ai.ts needs an update or we use a fetch directly
    // Let's assume aiApi has it or we add it. 
    // Since I can't see aiApi.createTask in previous tool output, I will add it to api/ai.ts first.
    // But for UI logic:
    createTaskMutation.mutate(type);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'FAILED': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'IN_PROGRESS': return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <Badge variant="secondary" className="bg-green-100 text-green-800">Concluído</Badge>;
      case 'FAILED': return <Badge variant="destructive">Falha</Badge>;
      case 'IN_PROGRESS': return <Badge variant="default" className="bg-blue-500">Executando</Badge>;
      default: return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Automação & Processos
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </CardTitle>
            <CardDescription>Gerencie tarefas assíncronas executadas pela IA</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              disabled={createTaskMutation.isPending}
              onClick={() => handleCreateTask('FINANCIAL_ANALYSIS')}
            >
              <BarChart className="w-4 h-4 mr-2 text-blue-500" />
              Análise Financeira
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              disabled={createTaskMutation.isPending}
              onClick={() => handleCreateTask('CATEGORIZATION')}
            >
              <Tag className="w-4 h-4 mr-2 text-orange-500" />
              Categorizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="space-y-3">
          {(!tasks || tasks.length === 0) && !isLoading && (
            <div className="text-center py-12 border border-dashed rounded-lg bg-muted/10">
              <p className="text-muted-foreground">Nenhuma tarefa registrada.</p>
              <p className="text-xs text-muted-foreground mt-1">Inicie uma nova análise acima.</p>
            </div>
          )}
          
          {tasks?.map((task: AITask) => (
            <div key={task.id} className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full bg-muted ${task.status === 'IN_PROGRESS' ? 'animate-pulse' : ''}`}>
                    {getStatusIcon(task.status)}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">
                      {task.type === 'FINANCIAL_ANALYSIS' ? 'Análise Financeira' : 
                       task.type === 'CATEGORIZATION' ? 'Categorização Automática' : task.type}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(task.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                {getStatusBadge(task.status)}
              </div>
              
              {task.resultSummary && (
                <div className="mt-3 text-sm bg-muted/50 p-3 rounded border text-muted-foreground whitespace-pre-wrap">
                  {task.resultSummary}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
