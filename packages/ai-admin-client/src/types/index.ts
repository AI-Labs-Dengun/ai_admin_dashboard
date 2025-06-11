// Configuração principal do cliente
export interface ClientConfig {
  dashboardUrl: string;
  botId: string;
  botSecret: string;
  options?: {
    autoReportUsage?: boolean;
    autoReportErrors?: boolean;
    reportInterval?: number; // em milissegundos
    maxRetries?: number;
    timeout?: number;
    debug?: boolean;
  };
}

// Sessão de usuário
export interface UserSession {
  userId: string;
  tenantId: string;
  sessionId: string;
  permissions?: string[];
  metadata?: Record<string, any>;
}

// Dados de uso do bot
export interface BotUsage {
  sessionId: string;
  userId: string;
  tenantId: string;
  action: string;
  tokensUsed: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Relatório de erro
export interface ErrorReport {
  sessionId?: string;
  userId?: string;
  tenantId?: string;
  error: string;
  errorCode?: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: number;
}

// Resposta do dashboard
export interface DashboardResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Status da conexão
export interface ConnectionStatus {
  connected: boolean;
  authenticated: boolean;
  lastPing: number;
  error?: string;
}

// Evento de telemetria
export interface TelemetryEvent {
  type: 'usage' | 'error' | 'connection' | 'custom';
  data: BotUsage | ErrorReport | ConnectionStatus | Record<string, any>;
  timestamp: number;
} 