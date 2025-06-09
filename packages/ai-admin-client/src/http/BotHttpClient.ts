import { ConfigManager } from '../config';

export class BotHttpClient {
  private config: ConfigManager;

  constructor(config: ConfigManager) {
    this.config = config;
  }

  private async request<T>(
    endpoint: string,
    method: string,
    data?: any
  ): Promise<T> {
    const url = `${this.config.getApiUrl()}/api/bots/${endpoint}`;
    const token = this.config.getToken();

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-bot-token': token
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

  public async reportTokenUsage(data: {
    tokens_used: number;
    action_type: string;
    chat_id?: string;
    chat_summary?: string;
    chat_content?: string;
    request_timestamp?: string;
    response_timestamp?: string;
  }): Promise<any> {
    return this.request('token-usage', 'POST', data);
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