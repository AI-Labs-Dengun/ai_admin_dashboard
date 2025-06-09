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
    
    // Mapear config para o formato esperado pelo TelemetryService
    const telemetryConfig = {
      baseUrl: config.apiUrl,
      apiUrl: config.apiUrl,
      botId: config.botId,
      token: config.token,
      userId: config.userId || '',
      tenantId: config.tenantId || '',
      options: config.options
    };
    
    this.telemetry = TelemetryService.getInstance(telemetryConfig);
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

  public async sendMessage(message: string, chatId?: string): Promise<any> {
    try {
      const response = await this.httpClient.sendMessage({
        message,
        chat_id: chatId
      });
      
      // Reportar uso de tokens através da telemetria se disponível na resposta
      if (response.token_usage?.used) {
        await this.telemetry.reportTokenUsage(
          response.token_usage.used,
          'chat',
          chatId
        );
      }
      
      return response;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  public async getTokenUsage(): Promise<any> {
    try {
      return await this.httpClient.getStatus();
    } catch (error) {
      console.error('Erro ao obter status de tokens:', error);
      throw error;
    }
  }

  public async handleError(error: Error, context?: any): Promise<void> {
    try {
      await this.httpClient.reportError({
        error_message: error.message,
        error_code: error.name
      });

      await this.telemetry.reportError(error, context);
    } catch (reportError) {
      console.error('Erro ao reportar erro:', reportError);
    }
  }

  public async stop(): Promise<void> {
    try {
      await this.httpClient.updateStatus('offline');
      await this.telemetry.stop();
    } catch (error) {
      console.error('Erro ao parar conexão:', error);
    }
  }
} 