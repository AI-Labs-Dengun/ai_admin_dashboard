import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Tenant, TenantUser, TokenUsage, Bot } from "./types";
import toast from "react-hot-toast";
import { checkUserPermissions } from "./authManagement";

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
  tenants: {
    tenant_bots: Array<{
      bot_id: string;
      enabled: boolean;
      bots: {
        id: string;
        name: string;
      };
    }>;
  };
  user_bots: Array<{
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
    // Verificar permissões
    const permissions = await checkUserPermissions();
    if (!permissions) {
      throw new Error("Usuário não autenticado");
    }

    const isSuperAdmin = permissions.isSuperAdmin;

    // Se não for super-admin, retornar apenas os dados do próprio usuário
    if (!isSuperAdmin) {
      const userResponse = await supabase
        .from("super_tenant_users")
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
          client_user_bots!user_id (
            bot_id,
            enabled,
            super_bots (
              id,
              name
            )
          )
        `)
        .eq("user_id", permissions.userId)
        .order("created_at", { ascending: false });

      if (userResponse.error) {
        console.error("Erro ao carregar dados do usuário:", userResponse.error);
        throw userResponse.error;
      }

      const tenantResponse = await supabase
        .from("super_tenants")
        .select("*")
        .eq("id", userResponse.data?.[0]?.tenant_id)
        .order("name");

      if (tenantResponse.error) {
        console.error("Erro ao carregar dados do tenant:", tenantResponse.error);
        throw tenantResponse.error;
      }

      // Buscar uso de tokens
      const tokenUsageResponse = await supabase
        .from("client_token_usage")
        .select("*")
        .eq("user_id", permissions.userId)
        .order("created_at", { ascending: false })
        .limit(1);

      const processedUsers: TenantUser[] = (userResponse.data as unknown as TenantUserResponse[]).map(user => ({
        user_id: user.user_id,
        tenant_id: user.tenant_id,
        role: user.role,
        allow_bot_access: user.allow_bot_access,
        token_limit: user.token_limit,
        profiles: user.profiles,
        token_usage: tokenUsageResponse.data?.[0] || {
          total_tokens: 0,
          last_used: new Date().toISOString()
        } as TokenUsage,
        bots: user.user_bots?.map(ub => ({
          id: ub.bot_id,
          name: ub.bots?.name || "Bot Desconhecido",
          enabled: ub.enabled,
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
      .from("super_tenant_users")
      .select(`
        user_id,
        tenant_id,
        role,
        allow_bot_access,
        token_limit,
        profiles:user_id (
          email,
          full_name
        ),
        super_tenants!tenant_id (
          super_tenant_bots (
            bot_id,
            enabled,
            super_bots (
              id,
              name
            )
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (usersResponse.error) {
      console.error("Erro ao carregar usuários:", usersResponse.error);
      throw usersResponse.error;
    }

    const tenantsResponse = await supabase
      .from("super_tenants")
      .select("*")
      .order("name");

    if (tenantsResponse.error) {
      console.error("Erro ao carregar tenants:", tenantsResponse.error);
      throw tenantsResponse.error;
    }

    // Buscar uso de tokens para todos os usuários
    const userIds = usersResponse.data.map(user => user.user_id);
    const tokenUsageResponse = await supabase
      .from("client_token_usage")
      .select("*")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    const processedUsers: TenantUser[] = (usersResponse.data as unknown as TenantUserResponse[]).map(user => {
      const userTokenUsage = tokenUsageResponse.data?.find(tu => tu.user_id === user.user_id);
      
      return {
        user_id: user.user_id,
        tenant_id: user.tenant_id,
        role: user.role,
        allow_bot_access: user.allow_bot_access,
        token_limit: user.token_limit,
        profiles: user.profiles,
        token_usage: userTokenUsage || {
          total_tokens: 0,
          last_used: new Date().toISOString()
        } as TokenUsage,
        bots: user.tenants?.tenant_bots?.map(tb => ({
          id: tb.bot_id,
          name: tb.bots?.name || "Bot Desconhecido",
          enabled: tb.enabled,
          token_usage: {
            total_tokens: 0,
            last_used: new Date().toISOString()
          } as TokenUsage
        })) as Bot[] || []
      };
    });

    return {
      users: processedUsers,
      tenants: tenantsResponse.data || []
    };
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao carregar dados");
    throw error;
  }
}; 