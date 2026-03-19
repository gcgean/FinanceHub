import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiApi, BackgroundJob, CalibrationRuleStats } from "@/api/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AIAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Queries
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['ai-admin-stats'],
    queryFn: aiApi.getAdminStats,
  });

  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: ['ai-admin-jobs'],
    queryFn: aiApi.listBackgroundJobs,
    enabled: activeTab === 'jobs',
    refetchInterval: 5000 // Polling for jobs
  });

  const { data: calibration, isLoading: loadingCalibration } = useQuery({
    queryKey: ['ai-admin-calibration'],
    queryFn: aiApi.getCalibrationStats,
    enabled: activeTab === 'calibration'
  });

  // Mutations
  const retryMutation = useMutation({
    mutationFn: aiApi.retryJob,
    onSuccess: () => {
      toast({ title: "Job reagendado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ['ai-admin-jobs'] });
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Administração de IA</h1>
        <Badge variant="outline">Admin Mode</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="jobs">Jobs & DLQ</TabsTrigger>
          <TabsTrigger value="calibration">Calibração</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {loadingStats ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Insights</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats?.totalInsights}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tarefas Autônomas</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats?.totalTasks}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Jobs Falhos (DLQ)</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive flex items-center gap-2">
                    {stats?.failedJobs}
                    {stats?.failedJobs && stats.failedJobs > 0 && <AlertTriangle className="w-5 h-5" />}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Regras Ativas</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats?.calibrationRules}</div></CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* JOBS TAB */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Fila de Processamento e DLQ</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingJobs ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="space-y-4">
                  {jobs?.map((job: BackgroundJob) => (
                    <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{job.queue}</span>
                          <Badge variant={job.status === 'FAILED' ? 'destructive' : job.status === 'COMPLETED' ? 'default' : 'secondary'}>
                            {job.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">ID: {job.id} | Criado em: {new Date(job.createdAt).toLocaleString()}</p>
                        {job.lastError && (
                          <p className="text-xs text-destructive mt-1 bg-destructive/10 p-2 rounded max-w-2xl font-mono">
                            {job.lastError}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right text-xs text-muted-foreground">
                          <p>Tentativas: {job.attempts}/{job.maxAttempts}</p>
                          {job.finishedAt && <p>Fim: {new Date(job.finishedAt).toLocaleTimeString()}</p>}
                        </div>
                        
                        {job.status === 'FAILED' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => retryMutation.mutate(job.id)}
                            disabled={retryMutation.isPending}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {jobs?.length === 0 && <div className="text-center text-muted-foreground py-8">Nenhum job encontrado.</div>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CALIBRATION TAB */}
        <TabsContent value="calibration">
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Calibração das Regras</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCalibration ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="space-y-6">
                  {calibration?.map((rule: CalibrationRuleStats) => (
                    <div key={rule.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{rule.name}</h3>
                            <Badge variant="outline">{rule.code}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground">Aprovação</span>
                          <p className="text-xl font-bold">
                            {Math.round(rule.stats.approvalRate * 100)}%
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-muted/30 p-2 rounded">
                          <p className="text-xs text-muted-foreground">Total Disparos</p>
                          <p className="font-semibold">{rule.stats.totalEvents}</p>
                        </div>
                        <div className="bg-success/10 p-2 rounded text-success">
                          <p className="text-xs">Feedback Positivo</p>
                          <p className="font-semibold">{rule.stats.positive}</p>
                        </div>
                        <div className="bg-destructive/10 p-2 rounded text-destructive">
                          <p className="text-xs">Rejeição / Ruído</p>
                          <p className="font-semibold">{rule.stats.negative}</p>
                        </div>
                      </div>

                      <div className="bg-secondary/20 p-3 rounded text-xs font-mono">
                        <p className="mb-1 font-semibold text-secondary-foreground">Parâmetros Atuais:</p>
                        {rule.conditionsJson}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
