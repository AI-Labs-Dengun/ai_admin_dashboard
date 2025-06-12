import { EventEmitter } from 'events';
import axios from 'axios';
import { ClientConfig, BotUsage } from '../types/index';
import { TelemetryReporter } from './TelemetryReporter';

interface BotEndpointConfig {
  interactionsUrl: string;
  tokensUrl: string;
  pollInterval?: number;
}

interface TokenData {
  tokensUsed: number;
  timestamp: string;
}

interface InteractionData {
  count: number;
  timestamp: string;
}

interface JwtPayload {
  userId: string;
  tenantId: string;
  botId: string;
  botAccess: string[];
  allowBotAccess: boolean;
  tokenLimit: number;
  iat: number;
  exp: number;
}

export class BotDataCollector extends EventEmitter {
  private config: ClientConfig;
  private botConfig: BotEndpointConfig;
  private telemetryReporter: TelemetryReporter;
  private pollInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private lastTokenTimestamp: string | null = null;
  private lastInteractionTimestamp: string | null = null;
  private jwtPayload: JwtPayload | null = null;

  constructor(config: ClientConfig, botConfig: BotEndpointConfig) {
    super();
    this.config = config;
    this.botConfig = {
      pollInterval: 30000, // 30 segundos por padrão
      ...botConfig
    };
    this.telemetryReporter = new TelemetryReporter(config);
  }

  /**
   * Iniciar coleta de dados
   */
  async start(): Promise<void> {
    if (this.isActive) return;

    // Extrair payload do JWT da URL
    this.jwtPayload = this.extractJwtPayload(this.botConfig.interactionsUrl);
    
    this.isActive = true;
    this.startPolling();
    this.emit('started');
  }

  /**
   * Parar coleta de dados
   */
  async stop(): Promise<void> {
    this.isActive = false;
    this.stopPolling();
    this.emit('stopped');
  }

  /**
   * Definir o reporter de telemetria
   */
  setTelemetryReporter(reporter: TelemetryReporter): void {
    this.telemetryReporter = reporter;
  }

  /**
   * Extrair payload do JWT da URL
   */
  private extractJwtPayload(url: string): JwtPayload {
    try {
      const urlObj = new URL(url);
      const token = urlObj.searchParams.get('token');
      
      if (!token) {
        throw new Error('Token não encontrado na URL');
      }

      // Decodificar o JWT (apenas o payload, sem verificar a assinatura)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload) as JwtPayload;

      // Validar campos obrigatórios
      if (!payload.userId || !payload.tenantId || !payload.botId) {
        throw new Error('Token inválido: campos obrigatórios ausentes');
      }

      return payload;
    } catch (error) {
      throw new Error(`Erro ao extrair payload do token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Coletar dados de interações
   */
  private async collectInteractions(): Promise<void> {
    if (!this.jwtPayload) {
      throw new Error('JWT payload não disponível');
    }

    try {
      const response = await axios.get<{ interactions: InteractionData[] }>(this.botConfig.interactionsUrl, {
        params: {
          since: this.lastInteractionTimestamp
        }
      });

      if (response.data?.interactions) {
        for (const interaction of response.data.interactions) {
          // Converter interação para formato BotUsage
          const usage: BotUsage = {
            sessionId: `interaction_${this.jwtPayload.userId}_${this.jwtPayload.tenantId}`,
            userId: this.jwtPayload.userId,
            tenantId: this.jwtPayload.tenantId,
            action: 'interaction',
            tokensUsed: 0, // Interações não consomem tokens
            interactions: interaction.count,
            timestamp: new Date(interaction.timestamp).getTime(),
            metadata: {
              interactionCount: interaction.count,
              botId: this.jwtPayload.botId,
              tokenLimit: this.jwtPayload.tokenLimit
            }
          };

          await this.telemetryReporter.reportUsage(usage);
          this.lastInteractionTimestamp = interaction.timestamp;
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.emit('error', new Error(`Erro ao coletar interações: ${errorMessage}`));
    }
  }

  /**
   * Coletar dados de tokens
   */
  private async collectTokens(): Promise<void> {
    if (!this.jwtPayload) {
      throw new Error('JWT payload não disponível');
    }

    try {
      const response = await axios.get<{ tokens: TokenData[] }>(this.botConfig.tokensUrl, {
        params: {
          since: this.lastTokenTimestamp
        }
      });

      if (response.data?.tokens) {
        for (const token of response.data.tokens) {
          // Converter token para formato BotUsage
          const usage: BotUsage = {
            sessionId: `token_${this.jwtPayload.userId}_${this.jwtPayload.tenantId}`,
            userId: this.jwtPayload.userId,
            tenantId: this.jwtPayload.tenantId,
            action: 'token_usage',
            tokensUsed: token.tokensUsed,
            timestamp: new Date(token.timestamp).getTime(),
            metadata: {
              botId: this.jwtPayload.botId,
              tokenLimit: this.jwtPayload.tokenLimit
            }
          };

          await this.telemetryReporter.reportUsage(usage);
          this.lastTokenTimestamp = token.timestamp;
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.emit('error', new Error(`Erro ao coletar tokens: ${errorMessage}`));
    }
  }

  private startPolling(): void {
    this.stopPolling();
    
    this.pollInterval = setInterval(async () => {
      if (!this.isActive) return;

      try {
        await Promise.all([
          this.collectInteractions(),
          this.collectTokens()
        ]);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.emit('error', new Error(`Erro no polling: ${errorMessage}`));
      }
    }, this.botConfig.pollInterval);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
} 