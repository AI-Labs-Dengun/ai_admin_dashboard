import { EventEmitter } from 'events';
import { ConnectionManager } from './ConnectionManager';
import { ClientConfig, BotUsage } from '../types/index';

interface UsageStats {
  totalTokens: number;
  totalInteractions: number;
}

interface TelemetryStats {
  byUser: Record<string, UsageStats>;
  byTenant: Record<string, UsageStats>;
  byBot: Record<string, UsageStats>;
  total: UsageStats;
}

/**
 * Objetivo 3: Reportar dados sobre o consumo do bot pelo usuário
 */
export class TelemetryReporter extends EventEmitter {
  private config: ClientConfig;
  private connectionManager: ConnectionManager | null = null;
  private usageQueue: BotUsage[] = [];
  private reportInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private stats: TelemetryStats = {
    byUser: {},
    byTenant: {},
    byBot: {},
    total: { totalTokens: 0, totalInteractions: 0 }
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
    if (!this.connectionManager) {
      throw new Error('ConnectionManager não configurado');
    }

    try {
      // Adicionar à fila local
      this.usageQueue.push(usage);
      
      // Atualizar estatísticas locais
      this.updateStats(usage);

      // Enviar para o dashboard
      await this.connectionManager.sendData('/api/telemetry/usage', {
        ...usage,
        interactions: usage.interactions || 0 // Garantir que interactions seja enviado
      });

      this.emit('usageReported', usage);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de uso
   */
  async getStats(timeRange?: { start: number; end: number }): Promise<any> {
    try {
      // Obter estatísticas do servidor
      const serverStats = await this.connectionManager?.sendData('/api/telemetry/stats', {
        timeRange
      });

      // Combinar com estatísticas locais
      return this.combineStats(this.stats, serverStats?.data || {});
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
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
    const { userId, tenantId, tokensUsed, interactions = 0 } = usage;
    const botId = usage.metadata?.botId as string;
    
    if (!botId) {
      this.emit('error', new Error('botId não encontrado nos metadados'));
      return;
    }
    
    // Atualizar estatísticas por usuário
    if (!this.stats.byUser[userId]) {
      this.stats.byUser[userId] = { totalTokens: 0, totalInteractions: 0 };
    }
    this.stats.byUser[userId].totalTokens += tokensUsed;
    this.stats.byUser[userId].totalInteractions += interactions;

    // Atualizar estatísticas por tenant
    if (!this.stats.byTenant[tenantId]) {
      this.stats.byTenant[tenantId] = { totalTokens: 0, totalInteractions: 0 };
    }
    this.stats.byTenant[tenantId].totalTokens += tokensUsed;
    this.stats.byTenant[tenantId].totalInteractions += interactions;

    // Atualizar estatísticas por bot
    if (!this.stats.byBot[botId]) {
      this.stats.byBot[botId] = { totalTokens: 0, totalInteractions: 0 };
    }
    this.stats.byBot[botId].totalTokens += tokensUsed;
    this.stats.byBot[botId].totalInteractions += interactions;

    // Atualizar estatísticas gerais
    this.stats.total.totalTokens += tokensUsed;
    this.stats.total.totalInteractions += interactions;
  }

  private combineStats(local: TelemetryStats, server: any): any {
    return {
      byUser: {
        ...local.byUser,
        ...server.byUser
      },
      byTenant: {
        ...local.byTenant,
        ...server.byTenant
      },
      byBot: {
        ...local.byBot,
        ...server.byBot
      },
      total: {
        totalTokens: (local.total.totalTokens || 0) + (server.total?.totalTokens || 0),
        totalInteractions: (local.total.totalInteractions || 0) + (server.total?.totalInteractions || 0)
      }
    };
  }
} 