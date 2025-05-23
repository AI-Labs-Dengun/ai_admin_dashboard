import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";
import { checkUserPermissions } from "./authManagement";

export const getTokenUsage = async (userId: string, tenantId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("token_usage")
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
      .from("token_usage")
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
      .from("token_usage")
      .select("total_tokens")
      .match({ tenant_id: tenantId })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    return data?.[0]?.total_tokens || 0;
  } catch (error) {
    console.error("Erro ao buscar resumo de tokens:", error);
    toast.error("Erro ao buscar resumo de tokens");
    throw error;
  }
};

export const resetUserTokens = async (userId: string, tenantId: string, botId?: string) => {
  const supabase = createClientComponentClient();
  
  try {
    // Verificar permissões
    const permissions = await checkUserPermissions();
    if (!permissions?.isSuperAdmin) {
      throw new Error("Sem permissão para resetar tokens");
    }

    if (botId) {
      // Resetar tokens de um bot específico
      const { error } = await supabase
        .from("token_usage")
        .update({ total_tokens: 0, updated_at: new Date().toISOString() })
        .match({ user_id: userId, tenant_id: tenantId, bot_id: botId });

      if (error) throw error;
    } else {
      // Resetar todos os tokens do usuário no tenant
      const { error } = await supabase
        .from("token_usage")
        .update({ total_tokens: 0, updated_at: new Date().toISOString() })
        .match({ user_id: userId, tenant_id: tenantId });

      if (error) throw error;
    }

    toast.success("Tokens resetados com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao resetar tokens:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao resetar tokens");
    throw error;
  }
}; 