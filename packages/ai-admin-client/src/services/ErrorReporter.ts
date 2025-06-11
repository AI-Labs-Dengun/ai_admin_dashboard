import { EventEmitter } from 'events';
import { ConnectionManager } from './ConnectionManager';
import { ClientConfig, ErrorReport } from '../types/index';

/**
 * Objetivo 4: Reportar erros, bugs e falhas da aplicação externa
 */
export class ErrorReporter extends EventEmitter {
  private config: ClientConfig;
  private connectionManager: ConnectionManager | null = null;
  private errorQueue: ErrorReport[] = [];
  private reportInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private errorStats = {
    totalErrors: 0,
    lastError: 0,
    errorsByType: new Map<string, number>()
  };

  constructor(config: ClientConfig) {
    super();
    this.config = config;
    this.setupGlobalErrorHandlers();
  }

  /**
   * Iniciar serviço de relatório de erros
   */
  async start(connectionManager?: ConnectionManager): Promise<void> {
    if (connectionManager) {
      this.connectionManager = connectionManager;
    }

    this.isActive = true;
    this.startReportInterval();
    this.emit('started');
  }

  /**
   * Definir o gerenciador de conexão
   */
  setConnectionManager(connectionManager: ConnectionManager): void {
    this.connectionManager = connectionManager;
  }

  /**
   * Parar serviço de relatório de erros
   */
  async stop(): Promise<void> {
    this.isActive = false;
    this.stopReportInterval();
    
    // Enviar erros restantes na fila
    if (this.errorQueue.length > 0) {
      await this.flushQueue();
    }
    
    this.emit('stopped');
  }

  /**
   * Reportar erro manualmente
   */
  async reportError(error: ErrorReport): Promise<void> {
    if (!this.isActive) return;

    // Adicionar à fila
    this.errorQueue.push(error);
    
    // Atualizar estatísticas
    this.updateStats(error);
    
    // Para erros críticos, enviar imediatamente
    if (this.isCriticalError(error)) {
      await this.flushQueue();
    }

    this.emit('errorAdded', error);
  }

  /**
   * Reportar erro a partir de exception
   */
  async reportException(exception: Error, context?: Record<string, any>): Promise<void> {
    const errorReport: ErrorReport = {
      error: exception.message,
      errorCode: exception.name,
      stack: exception.stack,
      context: {
        ...context,
        type: 'exception'
      },
      timestamp: Date.now()
    };

    await this.reportError(errorReport);
  }

  /**
   * Reportar erro de aplicação
   */
  async reportAppError(
    message: string, 
    errorCode?: string, 
    context?: Record<string, any>,
    sessionId?: string,
    userId?: string,
    tenantId?: string
  ): Promise<void> {
    const errorReport: ErrorReport = {
      sessionId,
      userId,
      tenantId,
      error: message,
      errorCode,
      context: {
        ...context,
        type: 'application'
      },
      timestamp: Date.now()
    };

    await this.reportError(errorReport);
  }

  /**
   * Obter estatísticas de erros
   */
  getErrorStats(): any {
    return {
      ...this.errorStats,
      errorsByType: Object.fromEntries(this.errorStats.errorsByType),
      pendingReports: this.errorQueue.length
    };
  }

  /**
   * Obter erros pendentes na fila
   */
  getPendingErrors(): ErrorReport[] {
    return [...this.errorQueue];
  }

  /**
   * Forçar envio dos erros na fila
   */
  async forceFlush(): Promise<void> {
    await this.flushQueue();
  }

  // Métodos privados

  private setupGlobalErrorHandlers(): void {
    if (typeof process !== 'undefined') {
      // Node.js error handlers
      process.on('uncaughtException', (error) => {
        this.reportException(error, { type: 'uncaughtException' });
      });

      process.on('unhandledRejection', (reason, promise) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        this.reportException(error, { 
          type: 'unhandledRejection',
          promise: String(promise)
        });
      });
    }

    if (typeof window !== 'undefined') {
      // Browser error handlers
      window.addEventListener('error', (event) => {
        this.reportException(event.error || new Error(event.message), {
          type: 'windowError',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        this.reportException(error, { type: 'unhandledRejection' });
      });
    }
  }

  private startReportInterval(): void {
    this.stopReportInterval();
    
    const interval = this.config.options?.reportInterval || 30000;
    this.reportInterval = setInterval(async () => {
      await this.flushQueue();
    }, interval);
  }

  private stopReportInterval(): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
  }

  private async flushQueue(): Promise<void> {
    if (this.errorQueue.length === 0) return;
    if (!this.connectionManager?.isConnectionActive()) {
      this.emit('warning', 'Não conectado ao dashboard - erros mantidos na fila');
      return;
    }

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    try {
      const response = await this.connectionManager.sendData('/api/bots/errors', {
        botId: this.config.botId,
        errors: errorsToSend
      });

      if (response.success) {
        this.emit('errorsReported', errorsToSend);
      } else {
        // Recolocar na fila se falhou
        this.errorQueue.unshift(...errorsToSend);
        this.emit('error', new Error(response.error || 'Falha ao reportar erros'));
      }
    } catch (error) {
      // Recolocar na fila se deu erro
      this.errorQueue.unshift(...errorsToSend);
      this.emit('error', error);
    }
  }

  private updateStats(error: ErrorReport): void {
    this.errorStats.totalErrors++;
    this.errorStats.lastError = error.timestamp;
    
    const errorType = error.errorCode || 'unknown';
    const currentCount = this.errorStats.errorsByType.get(errorType) || 0;
    this.errorStats.errorsByType.set(errorType, currentCount + 1);
  }

  private isCriticalError(error: ErrorReport): boolean {
    const criticalCodes = [
      'ECONNREFUSED',
      'TIMEOUT',
      'AUTH_FAILED',
      'CRITICAL_ERROR',
      'SECURITY_ERROR'
    ];
    
    return criticalCodes.includes(error.errorCode || '') ||
           error.error.toLowerCase().includes('critical') ||
           error.error.toLowerCase().includes('fatal');
  }
} 