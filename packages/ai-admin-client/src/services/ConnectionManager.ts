import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { ClientConfig, ConnectionStatus, DashboardResponse } from '../types/index';

/**
 * Objetivo 1: Gerenciar conexão entre a app externa e o AI Admin Dashboard
 */
export class ConnectionManager extends EventEmitter {
  private config: ClientConfig;
  private httpClient: AxiosInstance;
  private isConnected = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private authToken: string | null = null;
  private lastPing = 0;

  constructor(config: ClientConfig) {
    super();
    this.config = config;
    
    this.httpClient = axios.create({
      baseURL: config.dashboardUrl,
      timeout: config.options?.timeout || 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  /**
   * Estabelecer conexão com o dashboard
   */
  async connect(): Promise<void> {
    try {
      // Autenticar bot
      const authResponse = await this.httpClient.post('/api/bots/auth', {
        botId: this.config.botId,
        botSecret: this.config.botSecret
      });

      if (!authResponse.data?.success) {
        throw new Error(authResponse.data?.error || 'Falha na autenticação');
      }

      this.authToken = authResponse.data.token;
      this.isConnected = true;
      this.lastPing = Date.now();

      // Iniciar ping periódico
      this.startPingInterval();
      
      this.emit('connected');
    } catch (error) {
      this.isConnected = false;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Desconectar do dashboard
   */
  async disconnect(): Promise<void> {
    this.stopPingInterval();
    this.isConnected = false;
    this.authToken = null;
    this.emit('disconnected');
  }

  /**
   * Validar se usuário pode usar o bot
   */
  async validateUser(userId: string, tenantId: string): Promise<DashboardResponse> {
    try {
      const response = await this.httpClient.post('/api/bots/validate-user', {
        userId,
        tenantId,
        botId: this.config.botId
      });

      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao validar usuário'
      };
    }
  }

  /**
   * Enviar dados para o dashboard
   */
  async sendData(endpoint: string, data: any): Promise<DashboardResponse> {
    try {
      const response = await this.httpClient.post(endpoint, data);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar dados'
      };
    }
  }

  /**
   * Obter status da conexão
   */
  getStatus(): ConnectionStatus {
    return {
      connected: this.isConnected,
      authenticated: !!this.authToken,
      lastPing: this.lastPing,
      error: this.isConnected ? undefined : 'Não conectado'
    };
  }

  /**
   * Verificar se está conectado
   */
  isConnectionActive(): boolean {
    return this.isConnected && !!this.authToken;
  }

  // Métodos privados

  private setupInterceptors(): void {
    // Interceptor para adicionar token de auth
    this.httpClient.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });

    // Interceptor para tratar erros de auth
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expirado, tentar reconectar
          this.authToken = null;
          this.isConnected = false;
          this.emit('authExpired');
          
          // Tentar reconectar automaticamente
          try {
            await this.connect();
          } catch (reconnectError) {
            this.emit('error', reconnectError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    
    this.pingInterval = setInterval(async () => {
      try {
        await this.httpClient.get('/api/bots/ping');
        this.lastPing = Date.now();
      } catch (error) {
        this.emit('pingFailed', error);
        
        // Se ping falhar múltiplas vezes, considerar desconectado
        if (Date.now() - this.lastPing > 120000) { // 2 minutos
          this.isConnected = false;
          this.emit('disconnected');
        }
      }
    }, 30000); // Ping a cada 30 segundos
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
} 