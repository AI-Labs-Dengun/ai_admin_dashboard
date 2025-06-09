import { ConfigManager } from '../config';
import { TokenValidator } from '../services/TokenValidator';

export class BotHttpClient {
  private config: ConfigManager;
  private tokenValidator: TokenValidator;

  constructor(config: ConfigManager) {
    this.config = config;
    this.tokenValidator = TokenValidator.getInstance();
  }

  private async request<T>(
    endpoint: string,
    method: string,
    data?: any
  ): Promise<T> {
    const url = `${this.config.getApiUrl()}/api/bots/${endpoint}`;
    const token = this.config.getToken();

    // Validar token antes de fazer a requisição
    const validation = await this.tokenValidator.validateToken(token, {
      requireBotId: true,
      requireTenantId: true
    });

    if (!validation.valid) {
      throw new Error(`Token inválido: ${validation.error}`);
    }

    const { botId, tenantId, userId } = validation.payload;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-bot-token': token,
          'x-bot-id': botId,
          'x-bot-tenant-id': tenantId,
          'x-bot-user-id': userId
        },
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro na requisição');
      }

      return response.json();
    } catch (error) {
      if (this.config.getOptions()?.debug) {
        console.error(`Erro na requisição para ${endpoint}:`, error);
      }
      throw error;
    }
  }

  public async sendMessage(data: {
    message: string;
    chat_id?: string;
  }): Promise<any> {
    return this.request('chat', 'POST', data);
  }

  public async getStatus(): Promise<any> {
    return this.request('status', 'GET');
  }

  public async reportError(data: {
    error_message: string;
    error_code?: string;
  }): Promise<any> {
    return this.request('errors', 'POST', data);
  }

  public async updateStatus(status: 'online' | 'offline' | 'error' | 'maintenance'): Promise<any> {
    return this.request('status', 'POST', { status });
  }

  public async reportEvent(data: {
    type: string;
    event_data: any;
    message?: string;
    direction?: 'incoming' | 'outgoing';
  }): Promise<any> {
    return this.request('events', 'POST', data);
  }
} 