import { ConfigManager, BotConfig } from '../config';
import { BotHttpClient } from '../http/BotHttpClient';
import { TelemetryService } from './TelemetryService';

export class BotConnection {
  private config: ConfigManager;
  private httpClient: BotHttpClient;
  public telemetry: TelemetryService;

  constructor(config: BotConfig) {
    this.config = ConfigManager.getInstance(config);
    this.httpClient = new BotHttpClient(this.config);
    this.telemetry = TelemetryService.getInstance(config);
  }

  public async ping(): Promise<boolean> {
    try {
      await this.httpClient.updateStatus('online');
      return true;
    } catch (error) {
      console.error('Erro ao fazer ping:', error);
      return false;
    }
  }

  public async getTokenUsage(): Promise<any> {
    try {
      return await this.httpClient.reportTokenUsage({
        tokens_used: 0,
        action_type: 'check'
      });
    } catch (error) {
      console.error('Erro ao obter uso de tokens:', error);
      throw error;
    }
  }

  public async handleError(error: Error, context?: any): Promise<void> {
    try {
      await this.httpClient.reportError({
        error_message: error.message,
        error_code: error.name
      });

      await this.telemetry.reportError({
        type: 'error',
        message: error.message,
        data: {
          ...context,
          stack: error.stack
        }
      });
    } catch (reportError) {
      console.error('Erro ao reportar erro:', reportError);
    }
  }

  public async stop(): Promise<void> {
    try {
      await this.httpClient.updateStatus('offline');
      await this.telemetry.flush();
    } catch (error) {
      console.error('Erro ao parar conexão:', error);
    }
  }
} 