export interface Tenant {
  id: string;
  name: string;
}

export interface Profile {
  email: string;
  full_name: string;
  company: string;
}

export interface TokenUsage {
  id: string;
  user_id: string;
  tenant_id: string;
  bot_id: string;
  tokens_used: number;
  total_tokens: number;
  action_type: 'chat' | 'summary' | 'image_generation' | 'test' | 'other';
  request_timestamp: string;
  response_timestamp: string;
  last_used: string;
  created_at: string;
  updated_at: string;
  user_profile?: {
    email: string;
    full_name: string;
  };
  bot?: {
    name: string;
  };
  tenant?: {
    name: string;
  };
}

export interface BotInteractions {
  interactions: number;
  available_interactions: number;
  last_used?: string;
  total_tokens?: number;
}

export interface Bot {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  max_tokens_per_request: number;
  bot_capabilities: string[];
  interactions?: number;
  available_interactions?: number;
  last_used?: string;
  token_usage?: TokenUsage;
  bot_interactions?: BotInteractions;
}

export interface TenantUser {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  allow_bot_access: boolean;
  interactions_limit: number;
  is_active: boolean;
  profiles?: {
    email: string;
    full_name: string;
    company: string;
  };
  bots?: Bot[];
  token_usage?: TokenUsage;
  selected_bots?: string[];
  total_interactions?: number;
  total_available_interactions?: number;
}

export interface NewUser {
  email: string;
  full_name: string;
  company: string;
  tenant_id: string;
  allow_bot_access: boolean;
  selected_bots: string[];
  interactions_limit: number;
} 