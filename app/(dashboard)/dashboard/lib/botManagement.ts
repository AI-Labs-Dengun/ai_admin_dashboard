import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";

export const enableBot = async (tenantId: string, botId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { error } = await supabase
      .from("tenant_bots")
      .upsert({
        tenant_id: tenantId,
        bot_id: botId,
        enabled: true
      });

    if (error) throw error;

    toast.success("Bot habilitado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao habilitar bot:", error);
    toast.error("Erro ao habilitar bot");
    throw error;
  }
};

export const disableBot = async (tenantId: string, botId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { error } = await supabase
      .from("tenant_bots")
      .update({ enabled: false })
      .match({ tenant_id: tenantId, bot_id: botId });

    if (error) throw error;

    toast.success("Bot desabilitado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao desabilitar bot:", error);
    toast.error("Erro ao desabilitar bot");
    throw error;
  }
};

export const getBotUsage = async (tenantId: string, botId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("token_usage")
      .select("*")
      .match({ tenant_id: tenantId, bot_id: botId })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Erro ao buscar uso do bot:", error);
    toast.error("Erro ao buscar uso do bot");
    throw error;
  }
};

export const toggleBotAccess = async (userId: string, tenantId: string, currentValue: boolean) => {
  const supabase = createClientComponentClient();
  
  try {
    const { error } = await supabase
      .from("tenant_users")
      .update({ allow_bot_access: !currentValue })
      .match({ user_id: userId, tenant_id: tenantId });

    if (error) throw error;

    toast.success("Acesso atualizado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao atualizar acesso:", error);
    toast.error("Erro ao atualizar acesso");
    throw error;
  }
};

export const toggleBot = async (userId: string, botId: string, currentEnabled: boolean) => {
  const supabase = createClientComponentClient();
  
  try {
    const { error } = await supabase
      .from("tenant_bots")
      .update({ enabled: !currentEnabled })
      .match({ user_id: userId, bot_id: botId });

    if (error) throw error;

    toast.success("Status do bot atualizado com sucesso");
    return true;
  } catch (error) {
    console.error("Erro ao atualizar status do bot:", error);
    toast.error("Erro ao atualizar status do bot");
    throw error;
  }
}; 