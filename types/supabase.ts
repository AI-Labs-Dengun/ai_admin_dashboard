export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          company: string | null
          is_super_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          company?: string | null
          is_super_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          company?: string | null
          is_super_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tenants: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      tenant_users: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role: string
          allow_bot_access: boolean
          token_limit: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          role?: string
          allow_bot_access?: boolean
          token_limit?: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          role?: string
          allow_bot_access?: boolean
          token_limit?: number
          created_at?: string
        }
      }
      bots: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      tenant_bots: {
        Row: {
          id: string
          tenant_id: string
          bot_id: string
          enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          bot_id: string
          enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          bot_id?: string
          enabled?: boolean
          created_at?: string
        }
      }
      token_usage: {
        Row: {
          id: string
          user_id: string
          tenant_id: string
          bot_id: string
          total_tokens: number
          last_used: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id: string
          bot_id: string
          total_tokens?: number
          last_used?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string
          bot_id?: string
          total_tokens?: number
          last_used?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      token_usage_summary: {
        Row: {
          tenant_id: string
          bot_id: string
          total_tokens: number
        }
      }
      user_roles_summary: {
        Row: {
          user_id: string
          email: string
          full_name: string | null
          company: string | null
          is_super_admin: boolean
          role_summary: 'super-admin' | 'admin' | 'user'
          associated_tenants: string[]
        }
      }
    }
    Functions: {
      is_super_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      update_updated_at_column: {
        Args: Record<string, never>
        Returns: unknown
      }
      handle_new_user: {
        Args: Record<string, never>
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
} 