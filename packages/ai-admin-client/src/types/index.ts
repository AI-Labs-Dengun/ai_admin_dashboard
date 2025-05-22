export interface BotConfig {
  baseUrl: string;
  token: string;
  userId: string;
  tenantId: string;
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