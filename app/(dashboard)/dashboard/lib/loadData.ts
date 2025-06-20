import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Tenant, TenantUser, TokenUsage, Bot } from "./types";
import toast from "react-hot-toast";
import { checkUserPermissions } from "./authManagement";

interface TenantUserResponse {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  allow_bot_access: boolean;
  interactions_limit: number;
  is_active: boolean;
  profiles: {
    email: string;
    full_name: string;
    company: string;
  };
}

interface BotAuthorizationResponse {
  id: string;
  user_id: string;
  tenant_id: string;
  bot_id: string;
  is_authorized: boolean;
  super_bots: {
    id: string;
    name: string;
    description: string;
    max_tokens_per_request: number;
    bot_capabilities: string[];
    is_active: boolean;
  };
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
          id,
          user_id,
          tenant_id,
          role,
          allow_bot_access,
          interactions_limit,
          is_active,
          profiles!user_id (
            email,
            full_name,
            company
          )
        `)
        .eq("user_id", permissions.userId)
        .single();

      if (userResponse.error) {
        console.error("Erro ao carregar dados do usuário:", userResponse.error);
        throw userResponse.error;
      }

      // Buscar autorizações de bots para o usuário
      const botAuthResponse = await supabase
        .from("super_tenant_user_bots")
        .select(`
          id,
          user_id,
          tenant_id,
          bot_id,
          is_authorized,
          super_bots!bot_id (
            id,
            name,
            description,
            max_tokens_per_request,
            bot_capabilities,
            is_active
          )
        `)
        .eq("user_id", permissions.userId)
        .eq("tenant_id", userResponse.data?.tenant_id);

      if (botAuthResponse.error) {
        console.error("Erro ao carregar autorizações de bots:", botAuthResponse.error);
        throw botAuthResponse.error;
      }

      // Buscar uso de interações
      const interactionsResponse = await supabase
        .from("client_bot_usage")
        .select("id, interactions, available_interactions, last_used")
        .eq("user_id", permissions.userId)
        .eq("tenant_id", userResponse.data?.tenant_id)
        .order("last_used", { ascending: false })
        .limit(1)
        .single();

      if (interactionsResponse.error && interactionsResponse.error.code !== "PGRST116") {
        console.error("Erro ao carregar uso de interações:", interactionsResponse.error);
        throw interactionsResponse.error;
      }

      const tenantResponse = await supabase
        .from("super_tenants")
        .select("*")
        .eq("id", userResponse.data?.tenant_id)
        .single();

      if (tenantResponse.error) {
        console.error("Erro ao carregar dados do tenant:", tenantResponse.error);
        throw tenantResponse.error;
      }

      const processedUsers: TenantUser[] = [{
        id: userResponse.data.id,
        user_id: userResponse.data.user_id,
        tenant_id: userResponse.data.tenant_id,
        role: userResponse.data.role,
        allow_bot_access: userResponse.data.allow_bot_access,
        interactions_limit: userResponse.data.interactions_limit,
        is_active: userResponse.data.is_active,
        profiles: {
          email: userResponse.data.profiles[0].email,
          full_name: userResponse.data.profiles[0].full_name,
          company: userResponse.data.profiles[0].company
        },
        token_usage: {
          id: interactionsResponse.data?.id || '',
          user_id: permissions.userId,
          tenant_id: userResponse.data.tenant_id,
          bot_id: '',
          tokens_used: interactionsResponse.data?.interactions || 0,
          total_tokens: interactionsResponse.data?.interactions || 0,
          action_type: 'chat',
          request_timestamp: interactionsResponse.data?.last_used || new Date().toISOString(),
          response_timestamp: interactionsResponse.data?.last_used || new Date().toISOString(),
          last_used: interactionsResponse.data?.last_used || new Date().toISOString(),
          created_at: interactionsResponse.data?.last_used || new Date().toISOString(),
          updated_at: interactionsResponse.data?.last_used || new Date().toISOString()
        } as TokenUsage,
        total_interactions: interactionsResponse.data?.interactions || 0,
        total_available_interactions: interactionsResponse.data?.available_interactions || 0,
        bots: (botAuthResponse.data as unknown as BotAuthorizationResponse[])?.filter(auth => 
          auth.user_id === userResponse.data.user_id && 
          auth.tenant_id === userResponse.data.tenant_id &&
          auth.super_bots?.is_active
        ).map(auth => ({
          id: auth.bot_id,
          name: auth.super_bots?.name || "Bot Desconhecido",
          description: auth.super_bots?.description || "",
          enabled: auth.is_authorized,
          max_tokens_per_request: auth.super_bots?.max_tokens_per_request || 1000,
          bot_capabilities: auth.super_bots?.bot_capabilities || [],
          interactions: 0,
          available_interactions: 0,
          token_usage: {
            total_tokens: 0,
            last_used: new Date().toISOString()
          } as TokenUsage
        })) as Bot[] || []
      }];

      return {
        users: processedUsers,
        tenants: [tenantResponse.data]
      };
    }

    // Se for super-admin, retornar todos os dados
    const usersResponse = await supabase
      .from("super_tenant_users")
      .select(`
        id,
        user_id,
        tenant_id,
        role,
        allow_bot_access,
        interactions_limit,
        is_active,
        profiles!user_id (
          email,
          full_name,
          company
        )
      `)
      .order("created_at", { ascending: false });

    if (usersResponse.error) {
      console.error("Erro ao carregar usuários:", usersResponse.error);
      throw usersResponse.error;
    }

    // Buscar todas as autorizações de bots
    const allBotAuthResponse = await supabase
      .from("super_tenant_user_bots")
      .select(`
        id,
        user_id,
        tenant_id,
        bot_id,
        is_authorized,
        super_bots!bot_id (
          id,
          name,
          description,
          max_tokens_per_request,
          bot_capabilities,
          is_active
        )
      `);

    if (allBotAuthResponse.error) {
      console.error("Erro ao carregar autorizações de bots:", allBotAuthResponse.error);
      throw allBotAuthResponse.error;
    }

    const tenantsResponse = await supabase
      .from("super_tenants")
      .select("*")
      .order("name");

    if (tenantsResponse.error) {
      console.error("Erro ao carregar tenants:", tenantsResponse.error);
      throw tenantsResponse.error;
    }

    // Buscar uso de interações para todos os usuários
    const userIds = usersResponse.data.map(user => user.user_id);
    const interactionsResponse = await supabase
      .from("client_bot_usage")
      .select("*")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    // Criar mapa de autorizações de bots por usuário
    const botAuthMap = new Map<string, BotAuthorizationResponse[]>();
    (allBotAuthResponse.data as unknown as BotAuthorizationResponse[])?.forEach(auth => {
      const key = `${auth.user_id}-${auth.tenant_id}`;
      const userBots = botAuthMap.get(key) || [];
      userBots.push(auth);
      botAuthMap.set(key, userBots);
    });

    const processedUsers: TenantUser[] = (usersResponse.data as unknown as TenantUserResponse[]).map(user => {
      const userInteractions = interactionsResponse.data?.find(tu => 
        tu.user_id === user.user_id && 
        tu.tenant_id === user.tenant_id
      );
      const userBotAuths = botAuthMap.get(`${user.user_id}-${user.tenant_id}`) || [];
      
      // Calcular interações totais do usuário
      const userBotInteractions = interactionsResponse.data?.filter(tu => 
        tu.user_id === user.user_id && 
        tu.tenant_id === user.tenant_id
      ) || [];
      
      const totalInteractions = userBotInteractions.reduce((total, bot) => total + (bot.interactions || 0), 0);
      const totalAvailableInteractions = userBotInteractions.reduce((total, bot) => total + (bot.available_interactions || 0), 0);
      
      return {
        id: user.id,
        user_id: user.user_id,
        tenant_id: user.tenant_id,
        role: user.role,
        allow_bot_access: user.allow_bot_access,
        interactions_limit: user.interactions_limit,
        is_active: user.is_active,
        profiles: user.profiles,
        token_usage: userInteractions || {
          total_tokens: 0,
          last_used: new Date().toISOString()
        } as TokenUsage,
        total_interactions: totalInteractions,
        total_available_interactions: totalAvailableInteractions,
        bots: userBotAuths
          .filter(auth => auth.super_bots?.is_active)
          .map(auth => {
            const botInteractions = interactionsResponse.data?.find(tu => 
              tu.user_id === user.user_id && 
              tu.tenant_id === user.tenant_id && 
              tu.bot_id === auth.bot_id
            );
            
            return {
              id: auth.bot_id,
              name: auth.super_bots?.name || "Bot Desconhecido",
              description: auth.super_bots?.description || "",
              enabled: auth.is_authorized,
              max_tokens_per_request: auth.super_bots?.max_tokens_per_request || 1000,
              bot_capabilities: auth.super_bots?.bot_capabilities || [],
              interactions: botInteractions?.interactions || 0,
              available_interactions: botInteractions?.available_interactions || 0,
              last_used: botInteractions?.last_used,
              token_usage: {
                total_tokens: botInteractions?.interactions || 0,
                last_used: botInteractions?.last_used || new Date().toISOString()
              } as TokenUsage
            };
          }) as Bot[]
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