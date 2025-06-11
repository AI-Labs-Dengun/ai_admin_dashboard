export { AiAdminClient } from './AiAdminClient';
export type { 
  ClientConfig, 
  UserSession, 
  BotUsage, 
  ErrorReport, 
  ConnectionStatus, 
  DashboardResponse, 
  TelemetryEvent 
} from './types/index';

// Função helper para criar cliente
import type { ClientConfig } from './types/index';
import { AiAdminClient } from './AiAdminClient';

export const createAiAdminClient = (config: ClientConfig) => {
  return new AiAdminClient(config);
}; 