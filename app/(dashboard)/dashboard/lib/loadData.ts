import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Tenant, TenantUser, TokenUsage, Bot } from "./types";
import toast from "react-hot-toast";

interface TenantUserResponse {
  user_id: string;
  tenant_id: string;
  role: string;
  allow_bot_access: boolean;
  token_limit: number;
  profiles: {
    email: string;
    full_name: string;
  };
  tenant_bots: Array<{
    bot_id: string;
    enabled: boolean;
    bots: {
      id: string;
      name: string;
    };
  }>;
}

export const loadData = async () => {
  const supabase = createClientComponentClient();
  
  try {
    // Primeiro, verificar se o usuário é super-admin
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("id", user?.id)
      .single();

    const isSuperAdmin = profile?.is_super_admin || false;

    // Se não for super-admin, retornar apenas os dados do próprio usuário
    if (!isSuperAdmin) {
      const userResponse = await supabase
        .from("tenant_users")
        .select(`
          user_id,
          tenant_id,
          role,
          allow_bot_access,
          token_limit,
          profiles (
            email,
            full_name
          ),
          tenant_bots (
            bot_id,
            enabled,
            bots (
              id,
              name
            )
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (userResponse.error) {
        console.error("Erro ao carregar dados do usuário:", userResponse.error);
        throw userResponse.error;
      }

      const tenantResponse = await supabase
        .from("tenants")
        .select("*")
        .eq("id", userResponse.data?.[0]?.tenant_id)
        .order("name");

      if (tenantResponse.error) {
        console.error("Erro ao carregar dados do tenant:", tenantResponse.error);
        throw tenantResponse.error;
      }

      const processedUsers: TenantUser[] = (userResponse.data as unknown as TenantUserResponse[]).map(user => ({
        user_id: user.user_id,
        tenant_id: user.tenant_id,
        role: user.role,
        allow_bot_access: user.allow_bot_access,
        token_limit: user.token_limit,
        profiles: user.profiles,
        token_usage: {
          total_tokens: 0,
          last_used: new Date().toISOString()
        } as TokenUsage,
        bots: user.tenant_bots?.map(tb => ({
          id: tb.bot_id,
          name: tb.bots?.name || "Bot Desconhecido",
          enabled: tb.enabled,
          token_usage: {
            total_tokens: 0,
            last_used: new Date().toISOString()
          } as TokenUsage
        })) as Bot[]
      }));

      return {
        users: processedUsers,
        tenants: tenantResponse.data || []
      };
    }

    // Se for super-admin, retornar todos os dados
    const usersResponse = await supabase
      .from("tenant_users")
      .select(`
        user_id,
        tenant_id,
        role,
        allow_bot_access,
        token_limit,
        profiles (
          email,
          full_name
        ),
        tenant_bots (
          bot_id,
          enabled,
          bots (
            id,
            name
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (usersResponse.error) {
      console.error("Erro ao carregar usuários:", usersResponse.error);
      throw usersResponse.error;
    }

    const tenantsResponse = await supabase
      .from("tenants")
      .select("*")
      .order("name");

    if (tenantsResponse.error) {
      console.error("Erro ao carregar tenants:", tenantsResponse.error);
      throw tenantsResponse.error;
    }

    const processedUsers: TenantUser[] = (usersResponse.data as unknown as TenantUserResponse[]).map(user => ({
      user_id: user.user_id,
      tenant_id: user.tenant_id,
      role: user.role,
      allow_bot_access: user.allow_bot_access,
      token_limit: user.token_limit,
      profiles: user.profiles,
      token_usage: {
        total_tokens: 0,
        last_used: new Date().toISOString()
      } as TokenUsage,
      bots: user.tenant_bots?.map(tb => ({
        id: tb.bot_id,
        name: tb.bots?.name || "Bot Desconhecido",
        enabled: tb.enabled,
        token_usage: {
          total_tokens: 0,
          last_used: new Date().toISOString()
        } as TokenUsage
      })) as Bot[]
    }));

    return {
      users: processedUsers,
      tenants: tenantsResponse.data || []
    };
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    toast.error("Erro ao carregar dados. Por favor, tente novamente.");
    throw error;
  }
}; 