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

export interface Bot {
  id: string;
  name: string;
  description?: string;
  enabled?: boolean;
  token_usage?: TokenUsage;
  isInTenant?: boolean;
}

export interface TenantUser {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  allow_bot_access: boolean;
  token_limit: number;
  user: {
    email: string;
    full_name: string;
    company: string;
  };
  tenant: {
    name: string;
  };
  bots: Bot[];
  selected_bots?: string[];
  token_usage?: TokenUsage;
  profiles: Profile;
}

export interface NewUser {
  email: string;
  full_name: string;
  company: string;
  tenant_id: string;
  allow_bot_access: boolean;
  selected_bots: string[];
  token_limit: number;
} 