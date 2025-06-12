import { EventEmitter } from 'events';
import { ConnectionManager } from './services/ConnectionManager';
import { TelemetryReporter } from './services/TelemetryReporter';
import { ErrorReporter } from './services/ErrorReporter';
import { BotDataCollector } from './services/BotDataCollector';
import { ClientConfig, UserSession, BotUsage, ErrorReport, ConnectionStatus, DashboardResponse } from './types/index';

/**
 * Cliente principal para integração com o AI Admin Dashboard
 * 
 * Objetivos:
 * 1. Garantir conexão entre apps
 * 2. Suporte a múltiplos usuários simultâneos
 * 3. Relatório automático de uso
 * 4. Relatório automático de erros
 * 5. Coleta automática de dados do bot externo
 */
export class AiAdminClient extends EventEmitter {
  private config: ClientConfig;
  private connectionManager: ConnectionManager;
  private telemetryReporter: TelemetryReporter;
  private errorReporter: ErrorReporter;
  private botDataCollector: BotDataCollector | null = null;
  private activeSessions: Map<string, UserSession> = new Map();
  private isInitialized = false;

  constructor(config: ClientConfig) {
    super();
    this.config = {
      ...config,
      options: {
        autoReportUsage: true,
        autoReportErrors: true,
        reportInterval: 30000, // 30 segundos
        maxRetries: 3,
        timeout: 10000,
        debug: false,
        ...config.options
      }
    };

    this.connectionManager = new ConnectionManager(this.config);
    this.telemetryReporter = new TelemetryReporter(this.config);
    this.errorReporter = new ErrorReporter(this.config);

    this.setupEventListeners();
  }

  /**
   * Configurar coleta de dados do bot externo
   */
  setupBotDataCollection(botConfig: { interactionsUrl: string; tokensUrl: string; pollInterval?: number }): void {
    this.botDataCollector = new BotDataCollector(this.config, botConfig);
    this.botDataCollector.setTelemetryReporter(this.telemetryReporter);
    
    // Repassar eventos do coletor
    this.botDataCollector.on('error', (error) => {
      this.emit('botDataError', error);
    });
  }

  /**
   * Inicializa o cliente e estabelece conexão com o dashboard
   */
  async initialize(): Promise<void> {
    try {
      this.log('Inicializando cliente AI Admin...');
      
      // Estabelecer conexão
      await this.connectionManager.connect();
      
      // Configurar referência do ConnectionManager nos serviços
      this.telemetryReporter.setConnectionManager(this.connectionManager);
      this.errorReporter.setConnectionManager(this.connectionManager);
      
      // Inicializar serviços de relatório
      if (this.config.options?.autoReportUsage) {
        await this.telemetryReporter.start();
      }
      
      if (this.config.options?.autoReportErrors) {
        await this.errorReporter.start();
      }

      // Iniciar coleta de dados do bot se configurado
      if (this.botDataCollector) {
        await this.botDataCollector.start();
      }

      this.isInitialized = true;
      this.emit('initialized');
      this.log('Cliente inicializado com sucesso');
    } catch (error) {
      this.logError('Erro ao inicializar cliente:', error);
      throw error;
    }
  }

  /**
   * Objetivo 2: Criar sessão para usuário usar o bot
   */
  async createUserSession(userId: string, tenantId: string, metadata?: Record<string, any>): Promise<UserSession> {
    this.ensureInitialized();
    
    try {
      const sessionId = this.generateSessionId();
      
      // Validar usuário no dashboard
      const validation = await this.connectionManager.validateUser(userId, tenantId);
      if (!validation.success) {
        throw new Error(`Usuário não autorizado: ${validation.error}`);
      }

      const session: UserSession = {
        userId,
        tenantId,
        sessionId,
        permissions: validation.data?.permissions || [],
        metadata
      };

      this.activeSessions.set(sessionId, session);
      this.emit('sessionCreated', session);
      this.log(`Sessão criada para usuário ${userId} (${sessionId})`);

      return session;
    } catch (error) {
      this.logError('Erro ao criar sessão:', error);
      throw error;
    }
  }

  /**
   * Objetivo 3: Reportar uso do bot pelo usuário
   */
  async reportUsage(usage: Omit<BotUsage, 'timestamp'>): Promise<void> {
    const session = this.activeSessions.get(usage.sessionId);
    if (!session) {
      throw new Error('Sessão não encontrada');
    }

    const fullUsage: BotUsage = {
      ...usage,
      timestamp: Date.now()
    };

    if (this.config.options?.autoReportUsage) {
      await this.telemetryReporter.reportUsage(fullUsage);
    }

    this.emit('usageReported', fullUsage);
    this.log(`Uso reportado: ${usage.action} - ${usage.tokensUsed} tokens`);
  }

  /**
   * Objetivo 4: Reportar erros da aplicação
   */
  async reportError(error: Omit<ErrorReport, 'timestamp'>): Promise<void> {
    const fullError: ErrorReport = {
      ...error,
      timestamp: Date.now()
    };

    if (this.config.options?.autoReportErrors) {
      await this.errorReporter.reportError(fullError);
    }

    this.emit('errorReported', fullError);
    this.log(`Erro reportado: ${error.error}`);
  }

  /**
   * Encerrar sessão de usuário
   */
  async endUserSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.activeSessions.delete(sessionId);
      this.emit('sessionEnded', session);
      this.log(`Sessão encerrada: ${sessionId}`);
    }
  }

  /**
   * Objetivo 1: Verificar status da conexão
   */
  async getConnectionStatus(): Promise<ConnectionStatus> {
    return this.connectionManager.getStatus();
  }

  /**
   * Obter sessões ativas
   */
  getActiveSessions(): UserSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Obter estatísticas de uso
   */
  async getUsageStats(timeRange?: { start: number; end: number }): Promise<any> {
    return this.telemetryReporter.getStats(timeRange);
  }

  /**
   * Encerrar cliente e limpar recursos
   */
  async shutdown(): Promise<void> {
    try {
      this.log('Encerrando cliente...');
      
      // Encerrar todas as sessões ativas
      for (const sessionId of this.activeSessions.keys()) {
        await this.endUserSession(sessionId);
      }

      // Parar serviços
      await this.telemetryReporter.stop();
      await this.errorReporter.stop();
      if (this.botDataCollector) {
        await this.botDataCollector.stop();
      }
      await this.connectionManager.disconnect();

      this.isInitialized = false;
      this.emit('shutdown');
      this.log('Cliente encerrado');
    } catch (error) {
      this.logError('Erro ao encerrar cliente:', error);
      throw error;
    }
  }

  // Métodos privados

  private setupEventListeners(): void {
    this.connectionManager.on('connected', () => {
      this.emit('connected');
      this.log('Conectado ao dashboard');
    });

    this.connectionManager.on('disconnected', () => {
      this.emit('disconnected');
      this.log('Desconectado do dashboard');
    });

    this.connectionManager.on('error', (error) => {
      this.emit('error', error);
      this.logError('Erro de conexão:', error);
    });

    // Auto-reportar erros internos
    if (this.config.options?.autoReportErrors) {
      this.on('error', async (error) => {
        try {
          await this.reportError({
            error: error.message || String(error),
            errorCode: 'INTERNAL_ERROR',
            stack: error.stack,
            context: { component: 'AiAdminClient' }
          });
        } catch (reportError) {
          this.logError('Erro ao reportar erro interno:', reportError);
        }
      });
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Cliente não foi inicializado. Chame initialize() primeiro.');
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(message: string): void {
    if (this.config.options?.debug) {
      console.log(`[AiAdminClient] ${message}`);
    }
  }

  private logError(message: string, error: any): void {
    if (this.config.options?.debug) {
      console.error(`[AiAdminClient] ${message}`, error);
    }
  }
} 