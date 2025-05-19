import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";
import { checkUserPermissions } from "./authManagement";

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
    // Verificar permissões
    const permissions = await checkUserPermissions();
    if (!permissions?.isSuperAdmin) {
      throw new Error("Sem permissão para atualizar acesso aos bots");
    }

    const { error } = await supabase
      .from("tenant_users")
      .update({ allow_bot_access: !currentValue })
      .match({ user_id: userId, tenant_id: tenantId });

    if (error) throw error;

    toast.success("Acesso aos bots atualizado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao atualizar acesso aos bots:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao atualizar acesso aos bots");
    throw error;
  }
};

export const toggleBot = async (tenantId: string, botId: string, currentEnabled: boolean) => {
  const supabase = createClientComponentClient();
  
  try {
    // Verificar permissões
    const permissions = await checkUserPermissions();
    if (!permissions?.isSuperAdmin) {
      throw new Error("Sem permissão para atualizar status do bot");
    }

    // Verificar se o bot já está associado ao tenant
    const { data: existingBot, error: checkError } = await supabase
      .from("tenant_bots")
      .select("id")
      .match({ tenant_id: tenantId, bot_id: botId })
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (existingBot) {
      // Se o bot já existe, atualizar o status
      const { error: updateError } = await supabase
        .from("tenant_bots")
        .update({ enabled: !currentEnabled })
        .match({ tenant_id: tenantId, bot_id: botId });

      if (updateError) throw updateError;
    } else {
      // Se o bot não existe, criar a associação
      const { error: insertError } = await supabase
        .from("tenant_bots")
        .insert([
          {
            tenant_id: tenantId,
            bot_id: botId,
            enabled: true,
            created_at: new Date().toISOString()
          }
        ]);

      if (insertError) throw insertError;
    }

    toast.success("Status do bot atualizado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao atualizar status do bot:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao atualizar status do bot");
    throw error;
  }
};  