export interface BotConfig {
  apiUrl: string;
  botId: string;
  token: string;
  tenantId?: string;
  userId?: string;
  options?: {
    retryAttempts?: number;
    retryDelay?: number;
    timeout?: number;
    debug?: boolean;
  };
}

export const DEFAULT_CONFIG: Partial<BotConfig> = {
  options: {
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 5000,
    debug: false
  }
};

export class ConfigManager {
  private static instance: ConfigManager;
  private config: BotConfig;

  private constructor(config: BotConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      options: {
        ...DEFAULT_CONFIG.options,
        ...config.options
      }
    };
  }

  public static getInstance(config: BotConfig): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(config);
    }
    return ConfigManager.instance;
  }

  public getConfig(): BotConfig {
    return this.config;
  }

  public updateConfig(newConfig: Partial<BotConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      options: {
        ...this.config.options,
        ...newConfig.options
      }
    };
  }

  public getApiUrl(): string {
    return this.config.apiUrl;
  }

  public getBotId(): string {
    return this.config.botId;
  }

  public getToken(): string {
    return this.config.token;
  }

  public getTenantId(): string | undefined {
    return this.config.tenantId;
  }

  public getUserId(): string | undefined {
    return this.config.userId;
  }

  public getOptions(): BotConfig['options'] {
    return this.config.options;
  }
} 