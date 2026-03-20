import { apiFetch } from "@/utils/api";

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface MetricSnapshot {
  label: string;
  valorAtual: number;
  valorPrevisto: number;
  tendencia: 'up' | 'down' | 'stable';
  confianca: number;
}

export interface Insight {
  id: string;
  tipo: 'alerta' | 'tendencia' | 'oportunidade';
  titulo: string;
  descricao: string;
  impacto: number;
  confianca: number;
  categoria: string;
}

export interface AITask {
  id: string;
  type: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  resultSummary?: string;
  createdAt: string;
}

export interface NotificationChannel {
  id: string;
  type: 'EMAIL' | 'WHATSAPP' | 'TELEGRAM' | 'IN_APP';
  target: string;
  enabled: boolean;
}

export interface NotificationEvent {
  id: string;
  title: string;
  summary: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface Notification {
  id: string;
  channelType: string;
  deliveryStatus: string;
  readAt: string | null;
  createdAt: string;
  insightEvent: NotificationEvent;
}

export interface AIInsightEvent {
  id: string;
  title: string;
  summary: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  insightType: string;
  metricReference?: string;
  payloadJson?: string;
  occurredAt: string;
  status: 'NEW' | 'SENT' | 'READ' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
}

export interface AIProfile {
  id: string;
  tone: string;
  level: string;
  segment?: string;
  aiProvider?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
}

export interface BackgroundJob {
  id: string;
  queue: string;
  payload: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  runAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalibrationRuleStats {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  conditionsJson: string;
  stats: {
    totalEvents: number;
    totalFeedback: number;
    positive: number;
    negative: number;
    approvalRate: number;
  };
}

export const aiApi = {
  // Profile
  getProfile: async () => {
    return apiFetch<AIProfile>('/ai/profile');
  },
  updateProfile: async (data: Partial<AIProfile>) => {
    return apiFetch<AIProfile>('/ai/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  testConnection: async (provider: string, apiKey: string) => {
    return apiFetch<{ success: boolean; message: string }>('/ai/profile/test-connection', {
      method: 'POST',
      body: JSON.stringify({ provider, apiKey })
    });
  },

  // Chat
  createChat: async (title?: string) => {
    return apiFetch<ChatSession>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ title })
    });
  },

  listChats: async () => {
    return apiFetch<ChatSession[]>('/ai/chat');
  },

  getChat: async (chatId: string) => {
    return apiFetch<ChatSession>(`/ai/chat/${chatId}`);
  },

  sendMessage: async (chatId: string, content: string) => {
    return apiFetch<ChatMessage>(`/ai/chat/${chatId}/message`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  },

  // Executive Reports & Alerts
  generateExecutiveReport: async () => {
    return apiFetch<{ relatorio: string }>('/ai/reports/executive', {
      method: 'POST'
    });
  },

  generateAlerts: async () => {
    return apiFetch<{ alertas: string }>('/ai/alerts', {
      method: 'POST'
    });
  },

  // Insights
  getPredictiveMetrics: async (horizon: '30d' | '90d' | '12m') => {
    const data = await apiFetch<{ metrics: MetricSnapshot[] }>(`/ai/predictive-metrics?horizon=${horizon}`);
    return data.metrics;
  },

  getInsights: async () => {
    const data = await apiFetch<{ insights: Insight[] }>('/ai/insights');
    return data.insights;
  },

  getInsightEvents: async () => {
    return apiFetch<AIInsightEvent[]>('/ai/insights/events');
  },

  // Tasks (New Phase 8)
  listTasks: async () => {
    return apiFetch<AITask[]>('/ai/tasks');
  },
  createTask: async (type: string) => {
    return apiFetch<AITask>('/ai/tasks', {
      method: 'POST',
      body: JSON.stringify({ type })
    });
  },

  // Reports
  downloadFinancialReport: async () => {
    const response = await apiFetch<Blob>('/ai/reports/financial', {
      headers: {
        'Accept': 'application/pdf',
      },
      responseType: 'blob'
    });
    return response;
  },

  // Notifications
  getNotifications: async () => {
    return apiFetch<Notification[]>('/ai/notifications');
  },
  markNotificationAsRead: async (id: string) => {
    return apiFetch(`/ai/notifications/${id}/read`, { method: 'PUT' });
  },
  markAllNotificationsAsRead: async () => {
    return apiFetch(`/ai/notifications/read-all`, { method: 'PUT' });
  },
  getNotificationChannels: async () => {
    return apiFetch<NotificationChannel[]>('/ai/notifications/channels');
  },
  saveNotificationChannel: async (channel: Omit<NotificationChannel, 'id'>) => {
    return apiFetch<NotificationChannel>('/ai/notifications/channels', {
      method: 'POST',
      body: JSON.stringify(channel),
    });
  },
  deleteNotificationChannel: async (id: string) => {
    return apiFetch(`/ai/notifications/channels/${id}`, { method: 'DELETE' });
  },

  // Admin
  getAdminStats: async () => {
    return apiFetch<{
      totalInsights: number;
      totalTasks: number;
      failedJobs: number;
      calibrationRules: number;
    }>('/ai/admin/stats');
  },
  listBackgroundJobs: async () => {
    return apiFetch<BackgroundJob[]>('/ai/admin/jobs');
  },
  retryJob: async (id: string) => {
    return apiFetch(`/ai/admin/jobs/${id}/retry`, { method: 'POST' });
  },
  getCalibrationStats: async () => {
    return apiFetch<CalibrationRuleStats[]>('/ai/admin/calibration');
  }
};
