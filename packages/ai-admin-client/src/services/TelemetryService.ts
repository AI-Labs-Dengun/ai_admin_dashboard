import axios from 'axios';
import { BotConfig } from '../types';

export interface TelemetryEvent {
  type: 'error' | 'warning' | 'info' | 'metric';
  message: string;
  data?: any;
  timestamp: number;
  botId?: string;
  tenantId?: string;
  userId?: string;
}

export interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

export class TelemetryService {
  private static instance: TelemetryService;
  private config: BotConfig;
  private queue: TelemetryEvent[] = [];
  private batchSize: number = 100;
  private flushInterval: number = 60000; // 1 minuto
  private timer: NodeJS.Timeout | null = null;
  private tokenUsage: Map<string, number> = new Map(); // Map<tenantId, tokens>

  private constructor(config: BotConfig) {
    this.config = config;
    this.startFlushTimer();
  }

  public static getInstance(config: BotConfig): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService(config);
    }
    return TelemetryService.instance;
  }

  private startFlushTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => this.flush(), this.flushInterval);
  }

  public async reportError(error: Error, context?: any) {
    const event: TelemetryEvent = {
      type: 'error',
      message: error.message,
      data: {
        stack: error.stack,
        ...context
      },
      timestamp: Date.now(),
      botId: this.config.botId,
      tenantId: this.config.tenantId,
      userId: this.config.userId
    };
    await this.queueEvent(event);
  }

  public async reportWarning(message: string, data?: any) {
    const event: TelemetryEvent = {
      type: 'warning',
      message,
      data,
      timestamp: Date.now(),
      botId: this.config.botId,
      tenantId: this.config.tenantId,
      userId: this.config.userId
    };
    await this.queueEvent(event);
  }

  public async reportInfo(message: string, data?: any) {
    const event: TelemetryEvent = {
      type: 'info',
      message,
      data,
      timestamp: Date.now(),
      botId: this.config.botId,
      tenantId: this.config.tenantId,
      userId: this.config.userId
    };
    await this.queueEvent(event);
  }

  public async reportTokenUsage(tokens: number, actionType: string, chatId?: string) {
    // Atualizar contador local
    const currentUsage = this.tokenUsage.get(this.config.tenantId) || 0;
    this.tokenUsage.set(this.config.tenantId, currentUsage + tokens);

    // Reportar métrica
    await this.reportMetric({
      name: 'token_usage',
      value: tokens,
      tags: {
        action_type: actionType,
        chat_id: chatId || 'unknown'
      },
      timestamp: Date.now()
    });

    // Reportar evento
    await this.reportInfo('Token usage', {
      tokens_used: tokens,
      action_type: actionType,
      chat_id: chatId,
      total_tokens: currentUsage + tokens
    });
  }

  public async reportMetric(metric: MetricData) {
    const event: TelemetryEvent = {
      type: 'metric',
      message: metric.name,
      data: {
        ...metric,
        botId: this.config.botId,
        tenantId: this.config.tenantId,
        userId: this.config.userId
      },
      timestamp: Date.now()
    };
    await this.queueEvent(event);
  }

  private async queueEvent(event: TelemetryEvent) {
    this.queue.push(event);
    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const eventsToSend = [...this.queue];
    this.queue = [];

    try {
      await axios.post(`${this.config.baseUrl}/api/bots/telemetry`, {
        events: eventsToSend
      }, {
        headers: {
          'Authorization': `Bearer ${this.config.token}`
        }
      });
    } catch (error) {
      console.error('Erro ao enviar telemetria:', error);
      // Recolocar eventos na fila em caso de erro
      this.queue = [...this.queue, ...eventsToSend];
    }
  }

  public async getMetrics(metricName: string, timeRange: { start: number; end: number }) {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/bots/metrics`, {
        params: {
          metric: metricName,
          start: timeRange.start,
          end: timeRange.end
        },
        headers: {
          'Authorization': `Bearer ${this.config.token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter métricas:', error);
      throw error;
    }
  }

  public async getErrors(timeRange: { start: number; end: number }) {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/bots/errors`, {
        params: {
          start: timeRange.start,
          end: timeRange.end
        },
        headers: {
          'Authorization': `Bearer ${this.config.token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter erros:', error);
      throw error;
    }
  }

  public getTokenUsage(tenantId: string): number {
    return this.tokenUsage.get(tenantId) || 0;
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    return this.flush();
  }
} 