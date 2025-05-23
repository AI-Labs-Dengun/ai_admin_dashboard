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
  total_tokens: number;
  last_used: string;
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