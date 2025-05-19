export interface Tenant {
  id: string;
  name: string;
}

export interface Profile {
  email: string;
  full_name: string;
}

export interface TokenUsage {
  total_tokens: number;
  last_used: string;
}

export interface Bot {
  id: string;
  name: string;
  enabled: boolean;
  token_usage?: TokenUsage;
}

export interface TenantUser {
  user_id: string;
  tenant_id: string;
  role: string;
  allow_bot_access: boolean;
  token_limit?: number;
  profiles: Profile;
  token_usage?: TokenUsage;
  bots?: Bot[];
}

export interface NewUser {
  email: string;
  tenant_id: string;
  allow_bot_access: boolean;
} 