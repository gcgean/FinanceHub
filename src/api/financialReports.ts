import { apiFetch, toQueryString } from "@/utils/api";

// ─── Aging ───────────────────────────────────────────────────────────────────

export type AgingBucket = { label: string; count: number; amount: number };

export type AgingItem = {
  id: string;
  customerId: string | null;
  customerExternalId: string | null;
  customerName: string;
  knownName: string | null;
  document: string | null;
  documentNumber: string | null;
  externalId: string | null;
  externalSeq: string | null;
  issueDate: string;
  dueDate: string;
  amount: number;
  openAmount: number;
  daysOverdue: number;
  bucket: "future" | "d1_30" | "d31_60" | "d61_90" | "d91plus";
  sellerName: string | null;
};

export type AgingResponse = {
  buckets: {
    future: AgingBucket;
    d1_30: AgingBucket;
    d31_60: AgingBucket;
    d61_90: AgingBucket;
    d91plus: AgingBucket;
  };
  items: AgingItem[];
  totals: { count: number; amount: number };
};

export async function getAging(params: {
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  q?: string;
}) {
  return apiFetch<AgingResponse>(`/financial-reports/aging${toQueryString(params)}`);
}

// ─── Inadimplência por cliente ───────────────────────────────────────────────

export type DelinquencyItem = {
  customerId: string | null;
  customerExternalId: string | null;
  customerName: string;
  knownName: string | null;
  document: string | null;
  totalOpen: number;
  overdueCount: number;
  avgDelayDays: number;
  maxDelayDays: number;
  lastPaymentDate: string | null;
};

export type DelinquencyResponse = {
  items: DelinquencyItem[];
  totals: { totalOpen: number; totalCustomers: number; avgDelayDays: number };
};

export async function getDelinquencyByCustomer(params: {
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  top?: number;
}) {
  return apiFetch<DelinquencyResponse>(
    `/financial-reports/delinquency-by-customer${toQueryString(params)}`
  );
}

// ─── DSO ─────────────────────────────────────────────────────────────────────

export type DsoMonth = {
  month: string;
  dso: number;
  count: number;
  totalPaid: number;
};

export type DsoResponse = {
  months: DsoMonth[];
  overall: { avgDso: number; totalCount: number };
};

export async function getDso(params: { dateFrom?: string; dateTo?: string }) {
  return apiFetch<DsoResponse>(`/financial-reports/dso${toQueryString(params)}`);
}

// ─── Faturado x Recebido ─────────────────────────────────────────────────────

export type BilledVsReceivedMonth = {
  month: string;
  billed: number;
  received: number;
  gap: number;
};

export type BilledVsReceivedResponse = {
  months: BilledVsReceivedMonth[];
  totals: { billed: number; received: number; gap: number };
};

export async function getBilledVsReceived(params: {
  dateFrom?: string;
  dateTo?: string;
}) {
  return apiFetch<BilledVsReceivedResponse>(
    `/financial-reports/billed-vs-received${toQueryString(params)}`
  );
}

// ─── Previsão de Recebimento ─────────────────────────────────────────────────

export type ForecastMonth = {
  month: string;
  rawAmount: number;
  adjustedAmount: number;
  count: number;
};

export type ForecastResponse = {
  delinquencyRate: number;
  months: ForecastMonth[];
  totals: { rawAmount: number; adjustedAmount: number };
};

export async function getReceivableForecast(params: {
  dateFrom?: string;
  dateTo?: string;
  historicalMonths?: number;
}) {
  return apiFetch<ForecastResponse>(
    `/financial-reports/receivable-forecast${toQueryString(params)}`
  );
}

// ─── Clientes em Risco ───────────────────────────────────────────────────────

export type RiskItem = {
  customerId: string;
  customerName: string;
  knownName: string | null;
  document: string | null;
  overdueCount: number;
  maxDelayDays: number;
  daysSinceLastPayment: number | null;
  defaultRate: number;
  totalOpen: number;
  score: number;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
};

export type AtRiskResponse = { items: RiskItem[] };

export async function getAtRiskCustomers(params: { top?: number }) {
  return apiFetch<AtRiskResponse>(
    `/financial-reports/at-risk-customers${toQueryString(params)}`
  );
}

// ─── Churn ───────────────────────────────────────────────────────────────────

export type ChurnReason = { reason: string | null; count: number };

export type ChurnCustomer = { name: string; value: number | null; reason: string | null };

export type ChurnMonth = {
  month: string;
  churned: number;
  churnedValue: number;
  totalActiveAtMonth: number;
  churnRate: number;
  reasons: ChurnReason[];
  customers: ChurnCustomer[];
};

export type ChurnResponse = {
  months: ChurnMonth[];
  totals: {
    totalChurned: number;
    avgChurnRate: number;
    totalChurnedValue: number;
    activeCustomers: number;
  };
};

export async function getChurnAnalysis(params: {
  dateFrom?: string;
  dateTo?: string;
}) {
  return apiFetch<ChurnResponse>(
    `/financial-reports/churn${toQueryString(params)}`
  );
}

// ─── Cohort ──────────────────────────────────────────────────────────────────

export type CohortPeriod = {
  periodOffset: number;
  periodMonth: string;
  activeCount: number;
  retentionRate: number;
};

export type CohortRow = {
  cohortMonth: string;
  size: number;
  periods: CohortPeriod[];
};

export type CohortResponse = { cohorts: CohortRow[] };

export async function getCohortAnalysis(params: {
  dateFrom?: string;
  dateTo?: string;
}) {
  return apiFetch<CohortResponse>(
    `/financial-reports/cohort${toQueryString(params)}`
  );
}

// ─── Mudança de Comportamento de Pagamento ───────────────────────────────────

export type PaymentBehaviorItem = {
  customerId: string;
  customerName: string;
  knownName: string | null;
  document: string | null;
  historicalCount: number;
  historicalOnTimeRate: number;
  historicalAvgDelayDays: number;
  recentTotal: number;
  recentLateCount: number;
  recentLateRate: number;
  recentAvgDelayDays: number;
  totalOpen: number;
  severity: "MILD" | "MODERATE" | "SEVERE";
};

export type PaymentBehaviorResponse = {
  items: PaymentBehaviorItem[];
  totals: {
    total: number;
    severe: number;
    moderate: number;
    mild: number;
    totalOpenAtRisk: number;
  };
  recentMonths: number;
};

export async function getPaymentBehaviorChange(params: {
  recentMonths?: number;
}) {
  return apiFetch<PaymentBehaviorResponse>(
    `/financial-reports/payment-behavior-change${toQueryString(params)}`
  );
}

// ─── Análise Completa de Comportamento ──────────────────────────────────────

export type BehaviorCustomerBase = {
  customerId: string;
  customerName: string;
  knownName: string | null;
  document: string | null;
};

export type DeterioratingItem = BehaviorCustomerBase & {
  monthlyAvgDelay: { month: string; avgDays: number }[];
  firstHalfAvg: number;
  secondHalfAvg: number;
  trendDelta: number;
};

export type OnLimitItem = BehaviorCustomerBase & {
  totalPaid: number;
  pctNearLimit: number;
  avgDaysToPayment: number;
  earlyCount: number;
  onTimeCount: number;
  lateCount: number;
};

export type StoppedAnticipatorsItem = BehaviorCustomerBase & {
  historicalAvg: number;
  recentAvg: number;
  delta: number;
  historicalCount: number;
  recentCount: number;
};

export type IncreasingOpenItem = BehaviorCustomerBase & {
  totalOpen: number;
  overdueCount: number;
  openByMonth: { month: string; amount: number }[];
  firstHalfAvg: number;
  recentHalfAvg: number;
  growthPct: number;
};

export type RecurringSmallItem = BehaviorCustomerBase & {
  totalPaid: number;
  smallLateCount: number;
  smallLateRate: number;
  medianAmount: number;
  avgSmallDelay: number;
};

export type AlternatingItem = BehaviorCustomerBase & {
  transitions: number;
  monthCount: number;
  monthlyLateRates: { month: string; lateRate: number }[];
  avgLateRate: number;
  volatility: number;
};

export type ReducedPurchasesItem = BehaviorCustomerBase & {
  firstHalfAvgBilling: number;
  recentHalfAvgBilling: number;
  billingDeclinePct: number;
  historicalLateRate: number;
  recentLateRate: number;
  totalOpen: number;
};

export type ConcentratedItem = BehaviorCustomerBase & {
  totalOpen: number;
  overdueCount: number;
  overdueAmount: number;
  concentrationPct: number;
  totalOpenAR: number;
};

export type CriticalRiskItem = BehaviorCustomerBase & {
  score: number;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  recentAvgDelayDays: number;
  overdueCount: number;
  overdueAmount: number;
  behaviorDelta: number;
  daysSinceLastPayment: number | null;
  totalOpen: number;
};

export type RecoveredItem = BehaviorCustomerBase & {
  historicalLateRate: number;
  recentLateRate: number;
  improvement: number;
  historicalCount: number;
  recentCount: number;
  recentAvgDelay: number;
};

export type BehaviorFullResponse = {
  recentMonths: number;
  deteriorating: DeterioratingItem[];
  onLimit: OnLimitItem[];
  stoppedAnticipating: StoppedAnticipatorsItem[];
  increasingOpen: IncreasingOpenItem[];
  recurringSmall: RecurringSmallItem[];
  alternating: AlternatingItem[];
  reducedPurchases: ReducedPurchasesItem[];
  concentrated: ConcentratedItem[];
  criticalRisk: CriticalRiskItem[];
  recovered: RecoveredItem[];
  totalOpenAR: number;
};

export async function getBehaviorFullAnalysis(params: { recentMonths?: number }) {
  return apiFetch<BehaviorFullResponse>(
    `/financial-reports/behavior-full${toQueryString(params)}`
  );
}
