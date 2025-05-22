export * from './types';
export * from './services/BotConnection';

import { BotConnection } from './services/BotConnection';
import { BotConfig } from './types';

export function createBotConnection(config: BotConfig): BotConnection {
  return new BotConnection(config);
} 