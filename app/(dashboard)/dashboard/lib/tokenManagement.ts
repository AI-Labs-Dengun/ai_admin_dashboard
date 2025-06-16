import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";
import { checkUserPermissions } from "./authManagement";

export const getTokenUsage = async (userId: string, tenantId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("client_bot_usage")
      .select("*")
      .match({ user_id: userId, tenant_id: tenantId })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Erro ao buscar uso de tokens:", error);
    toast.error("Erro ao buscar uso de tokens");
    throw error;
  }
};

export const getTenantTokenUsage = async (tenantId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("client_bot_usage")
      .select("*")
      .match({ tenant_id: tenantId })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Erro ao buscar uso de tokens do tenant:", error);
    toast.error("Erro ao buscar uso de tokens do tenant");
    throw error;
  }
};

export const getTokenUsageSummary = async (tenantId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("client_bot_usage")
      .select(`
        *,
        profiles (
          email,
          full_name
        ),
        super_bots (
          name
        )
      `)
      .match({ tenant_id: tenantId })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Erro ao buscar resumo de uso de tokens:", error);
    toast.error("Erro ao buscar resumo de uso de tokens");
    throw error;
  }
};

export const resetUserTokens = async (userId: string, tenantId: string, botId?: string) => {
  const supabase = createClientComponentClient();
  
  try {
    if (botId) {
      const { error } = await supabase
        .from("client_bot_usage")
        .delete()
        .match({ user_id: userId, tenant_id: tenantId, bot_id: botId });

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("client_bot_usage")
        .delete()
        .match({ user_id: userId, tenant_id: tenantId });

      if (error) throw error;
    }

    toast.success("Tokens resetados com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao resetar tokens:", error);
    toast.error("Erro ao resetar tokens");
    throw error;
  }
};

export const checkTokenBalance = async (userId: string, tenantId: string, botId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    // Buscar limite de tokens do usuário
    const { data: userData, error: userError } = await supabase
      .from("super_tenant_users")
      .select("token_limit")
      .match({ user_id: userId, tenant_id: tenantId })
      .single();

    if (userError) throw userError;

    // Buscar uso atual de tokens
    const { data: usageData, error: usageError } = await supabase
      .from("client_bot_usage")
      .select("total_tokens")
      .match({ user_id: userId, tenant_id: tenantId, bot_id: botId })
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (usageError && usageError.code !== "PGRST116") throw usageError;

    const currentUsage = usageData?.total_tokens || 0;
    const tokenLimit = userData?.token_limit || 0;

    return {
      hasBalance: currentUsage < tokenLimit,
      currentUsage,
      tokenLimit,
      remainingTokens: tokenLimit - currentUsage
    };
  } catch (error) {
    console.error("Erro ao verificar saldo de tokens:", error);
    toast.error("Erro ao verificar saldo de tokens");
    throw error;
  }
};

export const calculateTokens = (text: string): number => {
  // Implementação simplificada - 1 token = 4 caracteres
  return Math.ceil(text.length / 4);
};

export const recordTokenUsage = async (
  userId: string,
  tenantId: string,
  botId: string,
  tokensConsumed: number,
  actionType: string = 'chat'
) => {
  const supabase = createClientComponentClient();
  
  try {
    // Buscar uso atual de tokens
    const { data: currentUsage, error: usageError } = await supabase
      .from("client_bot_usage")
      .select("total_tokens")
      .match({ user_id: userId, tenant_id: tenantId, bot_id: botId })
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (usageError && usageError.code !== "PGRST116") throw usageError;

    const totalTokens = (currentUsage?.total_tokens || 0) + tokensConsumed;

    // Registrar novo uso
    const { error: insertError } = await supabase
      .from("client_bot_usage")
      .insert([
        {
          user_id: userId,
          tenant_id: tenantId,
          bot_id: botId,
          tokens_used: tokensConsumed,
          total_tokens: totalTokens,
          action_type: actionType,
          request_timestamp: new Date().toISOString(),
          response_timestamp: new Date().toISOString(),
          last_used: new Date().toISOString()
        }
      ]);

    if (insertError) throw insertError;

    return true;
  } catch (error) {
    console.error("Erro ao registrar uso de tokens:", error);
    toast.error("Erro ao registrar uso de tokens");
    throw error;
  }
};

export const checkTokenBalanceServer = async (userId: string, tenantId: string, botId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    // Buscar limite de tokens do usuário
    const { data: userData, error: userError } = await supabase
      .from("super_tenant_users")
      .select("token_limit")
      .match({ user_id: userId, tenant_id: tenantId })
      .single();

    if (userError) throw userError;

    // Buscar uso atual de tokens
    const { data: usageData, error: usageError } = await supabase
      .from("client_bot_usage")
      .select("total_tokens")
      .match({ user_id: userId, tenant_id: tenantId, bot_id: botId })
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (usageError && usageError.code !== "PGRST116") throw usageError;

    const currentUsage = usageData?.total_tokens || 0;
    const tokenLimit = userData?.token_limit || 0;

    return {
      hasBalance: currentUsage < tokenLimit,
      currentUsage,
      tokenLimit,
      remainingTokens: tokenLimit - currentUsage
    };
  } catch (error) {
    console.error("Erro ao verificar saldo de tokens:", error);
    throw error;
  }
};

export async function recordTokenUsageServer(
  userId: string,
  tenantId: string,
  botId: string,
  tokensConsumed: number,
  actionType: 'chat' | 'summary' | 'image_generation' | 'test' | 'other'
): Promise<any> {
  const supabase = createClientComponentClient();
  
  try {
    // Buscar uso atual de tokens
    const { data: currentUsage, error: usageError } = await supabase
      .from("client_bot_usage")
      .select("total_tokens")
      .match({ user_id: userId, tenant_id: tenantId, bot_id: botId })
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (usageError && usageError.code !== "PGRST116") throw usageError;

    const totalTokens = (currentUsage?.total_tokens || 0) + tokensConsumed;

    // Registrar novo uso
    const { error: insertError } = await supabase
      .from("client_bot_usage")
      .insert([
        {
          user_id: userId,
          tenant_id: tenantId,
          bot_id: botId,
          tokens_used: tokensConsumed,
          total_tokens: totalTokens,
          action_type: actionType,
          request_timestamp: new Date().toISOString(),
          response_timestamp: new Date().toISOString(),
          last_used: new Date().toISOString()
        }
      ]);

    if (insertError) throw insertError;

    return true;
  } catch (error) {
    console.error("Erro ao registrar uso de tokens:", error);
    throw error;
  }
} 