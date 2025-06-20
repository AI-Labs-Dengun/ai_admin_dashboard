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
          phone: string | null
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
          phone?: string | null
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
          phone?: string | null
          is_super_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      support_tickets: {
        Row: {
          id: string
          title: string
          description: string
          status: 'pendente' | 'em_analise' | 'concluido'
          user_id: string
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          status?: 'pendente' | 'em_analise' | 'concluido'
          user_id: string
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          status?: 'pendente' | 'em_analise' | 'concluido'
          user_id?: string
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      support_ticket_messages: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          message?: string
          created_at?: string
        }
      }
      super_tenants: {
        Row: {
          id: string
          name: string
          token_limit: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          token_limit?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          token_limit?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      super_tenant_users: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role: string
          allow_bot_access: boolean
          interactions_limit: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          role?: string
          allow_bot_access?: boolean
          interactions_limit?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          role?: string
          allow_bot_access?: boolean
          interactions_limit?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      super_bots: {
        Row: {
          id: string
          name: string
          description: string | null
          bot_capabilities: string[]
          contact_email: string | null
          website: string | null
          max_tokens_per_request: number
          bot_secret: string
          is_active: boolean
          hostname: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          bot_capabilities?: string[]
          contact_email?: string | null
          website?: string | null
          max_tokens_per_request?: number
          bot_secret?: string
          is_active?: boolean
          hostname?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          bot_capabilities?: string[]
          contact_email?: string | null
          website?: string | null
          max_tokens_per_request?: number
          bot_secret?: string
          is_active?: boolean
          hostname?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      super_tenant_bots: {
        Row: {
          id: string
          tenant_id: string
          bot_id: string
          enabled: boolean
          hostname: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          bot_id: string
          enabled?: boolean
          hostname?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          bot_id?: string
          enabled?: boolean
          hostname?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      super_tenant_user_bots: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          bot_id: string
          is_authorized: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          bot_id: string
          is_authorized?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          bot_id?: string
          is_authorized?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      super_bot_requests: {
        Row: {
          id: string
          bot_name: string
          bot_description: string | null
          bot_capabilities: string[]
          contact_email: string
          website: string | null
          max_tokens_per_request: number
          status: 'pending' | 'approved' | 'rejected'
          admin_notes: string | null
          attempts: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bot_name: string
          bot_description?: string | null
          bot_capabilities?: string[]
          contact_email: string
          website?: string | null
          max_tokens_per_request?: number
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          attempts?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bot_name?: string
          bot_description?: string | null
          bot_capabilities?: string[]
          contact_email?: string
          website?: string | null
          max_tokens_per_request?: number
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          attempts?: number
          created_at?: string
          updated_at?: string
        }
      }
      client_bot_usage: {
        Row: {
          id: string
          user_id: string | null
          tenant_id: string | null
          bot_id: string | null
          bot_name: string
          enabled: boolean
          tokens_used: number
          interactions: number
          available_interactions: number
          total_tokens: number
          action_type: 'chat' | 'summary' | 'image_generation' | 'other' | null
          status: 'active' | 'inactive' | 'error' | 'maintenance'
          last_used: string | null
          error_count: number
          last_error_message: string | null
          last_error_at: string | null
          website: string | null
          hostname: string | null
          metadata: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          tenant_id?: string | null
          bot_id?: string | null
          bot_name: string
          enabled?: boolean
          tokens_used?: number
          interactions?: number
          available_interactions?: number
          total_tokens?: number
          action_type?: 'chat' | 'summary' | 'image_generation' | 'other' | null
          status?: 'active' | 'inactive' | 'error' | 'maintenance'
          last_used?: string | null
          error_count?: number
          last_error_message?: string | null
          last_error_at?: string | null
          website?: string | null
          hostname?: string | null
          metadata?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          tenant_id?: string | null
          bot_id?: string | null
          bot_name?: string
          enabled?: boolean
          tokens_used?: number
          interactions?: number
          available_interactions?: number
          total_tokens?: number
          action_type?: 'chat' | 'summary' | 'image_generation' | 'other' | null
          status?: 'active' | 'inactive' | 'error' | 'maintenance'
          last_used?: string | null
          error_count?: number
          last_error_message?: string | null
          last_error_at?: string | null
          website?: string | null
          hostname?: string | null
          metadata?: any
          created_at?: string
          updated_at?: string
        }
      }
      client_bot_status: {
        Row: {
          id: string
          bot_id: string
          tenant_id: string
          status: 'active' | 'inactive' | 'error' | 'maintenance'
          last_used: string | null
          total_messages: number
          error_count: number
          last_error_message: string | null
          last_error_at: string | null
          metadata: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bot_id: string
          tenant_id: string
          status?: 'active' | 'inactive' | 'error' | 'maintenance'
          last_used?: string | null
          total_messages?: number
          error_count?: number
          last_error_message?: string | null
          last_error_at?: string | null
          metadata?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bot_id?: string
          tenant_id?: string
          status?: 'active' | 'inactive' | 'error' | 'maintenance'
          last_used?: string | null
          total_messages?: number
          error_count?: number
          last_error_message?: string | null
          last_error_at?: string | null
          metadata?: any
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      token_usage_analytics: {
        Row: {
          tenant_id: string | null
          bot_id: string | null
          user_id: string | null
          action_type: 'chat' | 'summary' | 'image_generation' | 'other' | null
          usage_date: string | null
          total_requests: number
          total_tokens: number
          avg_tokens_per_request: number
          first_request: string | null
          last_request: string | null
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
      user_bots_details: {
        Row: {
          id: string
          user_id: string | null
          tenant_id: string | null
          bot_id: string | null
          enabled: boolean
          created_at: string
          admin_name: string | null
          admin_email: string | null
          bot_name: string | null
          bot_description: string | null
          bot_capabilities: string[] | null
          max_tokens_per_request: number | null
          bot_website: string | null
          allow_bot_access: boolean | null
          interactions_limit: number | null
          tenant_name: string | null
          tokens_consumed: number
          last_token_usage: string | null
          status: 'active' | 'inactive' | 'error' | 'maintenance'
          error_count: number
          last_error_message: string | null
          last_error_at: string | null
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
      update_last_access: {
        Args: Record<string, never>
        Returns: unknown
      }
      generate_bot_secret: {
        Args: Record<string, never>
        Returns: string
      }
      validate_bot_secret: {
        Args: {
          p_bot_secret: string
        }
        Returns: {
          bot_id: string
          bot_name: string
          is_valid: boolean
        }[]
      }
      handle_tenant_user_access_change: {
        Args: Record<string, never>
        Returns: unknown
      }
      handle_tenant_bot_change: {
        Args: Record<string, never>
        Returns: unknown
      }
      check_bot_access: {
        Args: {
          p_user_id: string
          p_tenant_id: string
          p_bot_id: string
        }
        Returns: boolean
      }
      update_bot_interactions: {
        Args: {
          p_user_id: string
          p_tenant_id: string
          p_bot_id: string
          p_increment?: number
        }
        Returns: boolean
      }
      update_bot_name: {
        Args: Record<string, never>
        Returns: unknown
      }
      extract_hostname: {
        Args: {
          p_url: string
        }
        Returns: string
      }
      normalize_hostname: {
        Args: {
          p_hostname: string
        }
        Returns: string
      }
      find_hostname_variations: {
        Args: {
          p_hostname: string
        }
        Returns: string[]
      }
      find_usage_by_hostname: {
        Args: {
          p_hostname: string
        }
        Returns: {
          id: string
          user_id: string | null
          tenant_id: string | null
          bot_id: string | null
          bot_name: string
          hostname: string | null
          website: string | null
          enabled: boolean
          status: 'active' | 'inactive' | 'error' | 'maintenance'
          tokens_used: number
          interactions: number
          available_interactions: number
          last_used: string | null
          created_at: string
          updated_at: string
          search_method: string
        }[]
      }
      update_usage_by_hostname: {
        Args: {
          p_hostname: string
          p_tokens?: number
          p_interactions?: number
        }
        Returns: any
      }
      check_bot_availability_by_hostname: {
        Args: {
          p_hostname: string
        }
        Returns: any
      }
      update_super_bots_hostname: {
        Args: Record<string, never>
        Returns: number
      }
      update_client_bot_usage_hostname: {
        Args: Record<string, never>
        Returns: number
      }
      set_hostname_super_tenant_bots: {
        Args: Record<string, never>
        Returns: unknown
      }
      sync_hostname_super_tenant_bots: {
        Args: Record<string, never>
        Returns: unknown
      }
      propagate_hostname_changes: {
        Args: Record<string, never>
        Returns: unknown
      }
      ensure_all_hostnames: {
        Args: Record<string, never>
        Returns: any
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
} 