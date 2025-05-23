import axios, { AxiosInstance } from 'axios';
import { BotConfig, TokenResponse, BotAccess, TokenUsage, ErrorResponse, BotConnectionStatus } from '../types';

export class BotConnection {
  private client: AxiosInstance;
  private config: BotConfig;
  private tokenExpiration: number = 0;
  private connectionStatus: BotConnectionStatus = {
    isConnected: false
  };

  constructor(config: BotConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`
      }
    });

    // Interceptor para renovação automática do token
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && Date.now() >= this.tokenExpiration) {
          try {
            await this.refreshToken();
            error.config.headers['Authorization'] = `Bearer ${this.config.token}`;
            return this.client(error.config);
          } catch (refreshError) {
            this.connectionStatus = {
              isConnected: false,
              error: 'Falha ao renovar token'
            };
            throw refreshError;
          }
        }
        throw error;
      }
    );
  }

  private async refreshToken(): Promise<void> {
    try {
      const response = await this.client.post<TokenResponse>('/api/bots/generate-token', {
        userId: this.config.userId,
        tenantId: this.config.tenantId
      });

      this.config.token = response.data.token;
      this.tokenExpiration = response.data.expiresAt;
      this.client.defaults.headers['Authorization'] = `Bearer ${this.config.token}`;
      
      this.connectionStatus = {
        isConnected: true,
        lastPing: new Date()
      };
    } catch (error) {
      this.connectionStatus = {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao renovar token'
      };
      throw error;
    }
  }

  public async getBotAccess(): Promise<BotAccess[]> {
    try {
      const response = await this.client.get<BotAccess[]>('/api/bots/access');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async getTokenUsage(): Promise<TokenUsage[]> {
    try {
      const response = await this.client.get<TokenUsage[]>('/api/bots/token-usage');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async ping(): Promise<boolean> {
    try {
      await this.client.get('/api/bots/ping');
      this.connectionStatus = {
        isConnected: true,
        lastPing: new Date()
      };
      return true;
    } catch (error) {
      this.connectionStatus = {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido no ping'
      };
      return false;
    }
  }

  public getConnectionStatus(): BotConnectionStatus {
    return { ...this.connectionStatus };
  }

  private handleError(error: any): ErrorResponse {
    if (axios.isAxiosError(error)) {
      return {
        error: error.response?.data?.error || error.message,
        code: error.response?.status?.toString(),
        details: error.response?.data
      };
    }
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
} 