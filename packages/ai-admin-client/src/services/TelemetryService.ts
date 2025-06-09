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
      timestamp: Date.now()
    };
    await this.queueEvent(event);
  }

  public async reportWarning(message: string, data?: any) {
    const event: TelemetryEvent = {
      type: 'warning',
      message,
      data,
      timestamp: Date.now()
    };
    await this.queueEvent(event);
  }

  public async reportInfo(message: string, data?: any) {
    const event: TelemetryEvent = {
      type: 'info',
      message,
      data,
      timestamp: Date.now()
    };
    await this.queueEvent(event);
  }

  public async reportMetric(metric: MetricData) {
    const event: TelemetryEvent = {
      type: 'metric',
      message: metric.name,
      data: metric,
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

    try {
      const events = [...this.queue];
      this.queue = [];

      await axios.post(`${this.config.baseUrl}/api/bots/telemetry`, {
        events
      }, {
        headers: {
          'Authorization': `Bearer ${this.config.token}`
        }
      });
    } catch (error) {
      console.error('Erro ao enviar telemetria:', error);
      // Recolocar eventos na fila em caso de erro
      this.queue = [...this.queue, ...events];
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

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    return this.flush();
  }
} 