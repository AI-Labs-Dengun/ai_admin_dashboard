import { EventEmitter } from 'events';
import { ConnectionManager } from './ConnectionManager';
import { ClientConfig, BotUsage } from '../types/index';

/**
 * Objetivo 3: Reportar dados sobre o consumo do bot pelo usuário
 */
export class TelemetryReporter extends EventEmitter {
  private config: ClientConfig;
  private connectionManager: ConnectionManager | null = null;
  private usageQueue: BotUsage[] = [];
  private reportInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private stats = {
    totalUsage: 0,
    totalTokens: 0,
    sessionCount: 0,
    lastReport: 0
  };

  constructor(config: ClientConfig) {
    super();
    this.config = config;
  }

  /**
   * Iniciar serviço de telemetria
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
   * Parar serviço de telemetria
   */
  async stop(): Promise<void> {
    this.isActive = false;
    this.stopReportInterval();
    
    // Enviar dados restantes na fila
    if (this.usageQueue.length > 0) {
      await this.flushQueue();
    }
    
    this.emit('stopped');
  }

  /**
   * Reportar uso do bot
   */
  async reportUsage(usage: BotUsage): Promise<void> {
    if (!this.isActive) return;

    // Adicionar à fila
    this.usageQueue.push(usage);
    
    // Atualizar estatísticas locais
    this.updateStats(usage);
    
    // Se a fila estiver cheia, enviar imediatamente
    if (this.usageQueue.length >= 10) {
      await this.flushQueue();
    }

    this.emit('usageAdded', usage);
  }

  /**
   * Obter estatísticas de uso
   */
  async getStats(timeRange?: { start: number; end: number }): Promise<any> {
    const localStats = { ...this.stats };

    // Se conectado, buscar stats do servidor também
    if (this.connectionManager?.isConnectionActive()) {
      try {
        const serverStats = await this.connectionManager.sendData('/api/bots/usage-stats', {
          botId: this.config.botId,
          timeRange
        });

        if (serverStats.success) {
          return {
            local: localStats,
            server: serverStats.data,
            combined: this.combineStats(localStats, serverStats.data)
          };
        }
      } catch (error) {
        this.emit('error', error);
      }
    }

    return { local: localStats };
  }

  /**
   * Obter fila de uso pendente
   */
  getPendingUsage(): BotUsage[] {
    return [...this.usageQueue];
  }

  /**
   * Forçar envio dos dados na fila
   */
  async forceFlush(): Promise<void> {
    await this.flushQueue();
  }

  // Métodos privados

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
    if (this.usageQueue.length === 0) return;
    if (!this.connectionManager?.isConnectionActive()) {
      this.emit('warning', 'Não conectado ao dashboard - dados mantidos na fila');
      return;
    }

    const dataToSend = [...this.usageQueue];
    this.usageQueue = [];

    try {
      const response = await this.connectionManager.sendData('/api/bots/usage', {
        botId: this.config.botId,
        usage: dataToSend
      });

      if (response.success) {
        this.stats.lastReport = Date.now();
        this.emit('usageReported', dataToSend);
      } else {
        // Recolocar na fila se falhou
        this.usageQueue.unshift(...dataToSend);
        this.emit('error', new Error(response.error || 'Falha ao reportar uso'));
      }
    } catch (error) {
      // Recolocar na fila se deu erro
      this.usageQueue.unshift(...dataToSend);
      this.emit('error', error);
    }
  }

  private updateStats(usage: BotUsage): void {
    this.stats.totalUsage++;
    this.stats.totalTokens += usage.tokensUsed;
    
    // Contar sessões únicas
    const uniqueSessions = new Set();
    this.usageQueue.forEach(u => uniqueSessions.add(u.sessionId));
    this.stats.sessionCount = uniqueSessions.size;
  }

  private combineStats(local: any, server: any): any {
    return {
      totalUsage: (local.totalUsage || 0) + (server.totalUsage || 0),
      totalTokens: (local.totalTokens || 0) + (server.totalTokens || 0),
      sessionCount: Math.max(local.sessionCount || 0, server.sessionCount || 0),
      lastReport: Math.max(local.lastReport || 0, server.lastReport || 0)
    };
  }
} 