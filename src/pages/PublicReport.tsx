import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, FileText, AlertCircle, Clock, Calendar, Brain } from "lucide-react";
import { publicReportsApi, type PublicReport } from "@/api/public-reports";
import { SupportDashboard } from "@/components/reports/SupportDashboard";

const TYPE_LABELS: Record<string, string> = {
  DAILY: "Diário",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
};

const CONTEXT_LABELS: Record<string, string> = {
  supportTickets: "Relatório de Atendimentos",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function PublicReportPage() {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<PublicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"not_found" | "expired" | "error" | null>(null);

  useEffect(() => {
    if (!token) { setError("not_found"); setLoading(false); return; }

    publicReportsApi.get(token)
      .then(data => { setReport(data); setLoading(false); })
      .catch((err) => {
        const code = err?.code ?? "";
        if (code === "REPORT_EXPIRED") setError("expired");
        else if (code === "REPORT_NOT_FOUND") setError("not_found");
        else setError("error");
        setLoading(false);
      });
  }, [token]);

  // ── loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  // ── erro ─────────────────────────────────────────────────────────────────
  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {error === "expired"
              ? "Relatório expirado"
              : error === "not_found"
              ? "Relatório não encontrado"
              : "Erro ao carregar relatório"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {error === "expired"
              ? "Este link expirou após 7 dias. Solicite um novo relatório."
              : error === "not_found"
              ? "O link acessado não corresponde a nenhum relatório. Verifique se o endereço está correto."
              : "Ocorreu um erro ao carregar o relatório. Tente novamente mais tarde."}
          </p>
          <div className="pt-2">
            <img src="/logo.png" alt="FinanceHub" className="h-6 mx-auto opacity-30" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <p className="text-xs text-muted-foreground mt-2">FinanceHub — BPO Financeiro</p>
          </div>
        </div>
      </div>
    );
  }

  const contextLabel = CONTEXT_LABELS[report.context] ?? report.context;
  const typeLabel = TYPE_LABELS[report.type] ?? report.type;
  const daysUntilExpiry = Math.ceil((new Date(report.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // ── relatório ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">{contextLabel}</p>
              <p className="text-xs text-muted-foreground">{typeLabel} · Gerado por FinanceHub</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground hidden sm:flex">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(report.periodFrom)} → {formatDate(report.periodTo)}</span>
            </div>
            {daysUntilExpiry <= 3 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                <Clock className="w-3.5 h-3.5" />
                <span>Expira em {daysUntilExpiry}d</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{report.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerado em {formatDateTime(report.createdAt)} · Válido até {formatDateTime(report.expiresAt)}
          </p>
        </div>

        {/* Dashboard de métricas */}
        {report.metricas && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Brain className="w-4 h-4 text-primary" />
              Dashboard de Métricas
            </div>
            <SupportDashboard m={report.metricas} />
          </div>
        )}

        {/* Análise textual */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6 sm:p-8">
          {report.metricas && (
            <div className="flex items-center gap-2 mb-4 pb-3 border-b">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Análise da Inteligência Artificial</span>
            </div>
          )}
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground break-words">
            {report.content}
          </pre>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-8 space-y-1">
          <p>Relatório gerado automaticamente pelo <strong>FinanceHub</strong></p>
          <p>Este link é público e expira em {formatDateTime(report.expiresAt)}</p>
        </div>
      </div>
    </div>
  );
}
