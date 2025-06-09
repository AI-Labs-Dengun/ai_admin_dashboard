export interface BotConfig {
  baseUrl: string;
  apiUrl: string;
  botId: string;
  token: string;
  userId: string;
  tenantId: string;
  options?: {
    retryAttempts?: number;
    retryDelay?: number;
    timeout?: number;
    debug?: boolean;
  };
}

export interface TokenResponse {
  token: string;
  expiresAt: number;
}

export interface BotAccess {
  botId: string;
  enabled: boolean;
}

export interface TokenUsage {
  totalTokens: number;
  lastUsed: Date;
  botId: string;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

export interface BotConnectionStatus {
  isConnected: boolean;
  lastPing?: Date;
  error?: string;
}

export interface BotRequest {
  botName: string;
  botDescription: string;
  botVersion: string;
  botCapabilities: string[];
  contactEmail: string;
  website?: string;
  maxTokensPerRequest?: number;
}

export interface BotRequestResponse {
  requestId: string;
  status: 'pending' | 'approved' | 'rejected';
  attempts: number;
  message?: string;
}

export interface BotRegistration {
  botId: string;
  tenantId: string;
  status: 'active' | 'inactive';
  tokenLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BotSession {
  token: string;
  ip: string;
  fingerprint: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface BotSessionResponse {
  sessionId: string;
  status: 'active' | 'expired' | 'invalid';
  expiresAt: Date;
}

export interface TelemetryEvent {
  type: 'error' | 'warning' | 'info' | 'metric';
  message: string;
  data?: any;
  timestamp: number;
  botId?: string;
  tenantId?: string;
  userId?: string;
}

export interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

export interface TelemetryResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface MetricResponse {
  name: string;
  values: Array<{
    timestamp: number;
    value: number;
  }>;
  tags?: Record<string, string>;
}

export interface ErrorReport {
  error: string;
  stack?: string;
  context?: any;
  timestamp: number;
  botId?: string;
  tenantId?: string;
  userId?: string;
} 