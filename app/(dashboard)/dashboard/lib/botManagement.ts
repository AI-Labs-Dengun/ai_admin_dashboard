import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";
import { checkUserPermissions } from "./authManagement";

export const enableBot = async (tenantId: string, botId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { error } = await supabase
      .from("super_tenant_bots")
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
      .from("super_tenant_bots")
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
      .from("client_bot_usage")
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
      .from("super_tenant_users")
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

export const toggleBot = async (userId: string, botId: string, currentEnabled: boolean) => {
  const supabase = createClientComponentClient();
  
  try {
    const newEnabledState = !currentEnabled;

    // Atualizar apenas o estado de ativação do bot
    const { error } = await supabase
      .from("client_user_bots")
      .update({ enabled: newEnabledState })
      .match({ user_id: userId, bot_id: botId });

    if (error) throw error;

    toast.success(`Bot ${newEnabledState ? 'ativado' : 'desativado'} com sucesso!`);
    return true;
  } catch (error) {
    console.error("Erro ao atualizar estado do bot:", error);
    toast.error("Erro ao atualizar estado do bot");
    throw error;
  }
};

export const toggleAllBots = async (userId: string, tenantId: string, currentEnabled: boolean) => {
  const supabase = createClientComponentClient();
  
  try {
    const newEnabledState = !currentEnabled;

    // Atualizar apenas o estado de ativação de todos os bots do usuário
    const { error } = await supabase
      .from("client_user_bots")
      .update({ enabled: newEnabledState })
      .match({ user_id: userId, tenant_id: tenantId });

    if (error) throw error;

    toast.success(`Todos os bots ${newEnabledState ? 'ativados' : 'desativados'} com sucesso!`);
    return true;
  } catch (error) {
    console.error("Erro ao atualizar estado dos bots:", error);
    toast.error("Erro ao atualizar estado dos bots");
    throw error;
  }
};

// Função para verificar se o usuário é super_admin
async function checkSuperAdmin() {
  const supabase = createClientComponentClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (error) throw error;
  return profile?.is_super_admin;
}

// Função para atualizar o status de autorização de um bot no tenant
export async function updateTenantBotAuthorization(tenantId: string, botId: string, enabled: boolean) {
  try {
    const isSuperAdmin = await checkSuperAdmin();
    if (!isSuperAdmin) {
      throw new Error('Apenas super_admins podem gerenciar autorizações de bots');
    }

    const supabase = createClientComponentClient();
    
    // Atualizar o status do bot no tenant
    const { error: updateError } = await supabase
      .from('super_tenant_bots')
      .update({ enabled })
      .match({ tenant_id: tenantId, bot_id: botId });

    if (updateError) throw updateError;

    // Se o bot foi desativado, desativar o acesso para todos os usuários do tenant
    if (!enabled) {
      const { error: userBotsError } = await supabase
        .from('client_bot_usage')
        .update({ enabled: false })
        .match({ tenant_id: tenantId, bot_id: botId });

      if (userBotsError) throw userBotsError;
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar autorização do bot:', error);
    throw error;
  }
}

// Função para atualizar o status de autorização de todos os bots de um tenant
export async function updateAllTenantBotsAuthorization(tenantId: string, enabled: boolean) {
  try {
    const isSuperAdmin = await checkSuperAdmin();
    if (!isSuperAdmin) {
      throw new Error('Apenas super_admins podem gerenciar autorizações de bots');
    }

    const supabase = createClientComponentClient();
    
    // Atualizar o status de todos os bots no tenant
    const { error: updateError } = await supabase
      .from('super_tenant_bots')
      .update({ enabled })
      .eq('tenant_id', tenantId);

    if (updateError) throw updateError;

    // Se os bots foram desativados, desativar o acesso para todos os usuários do tenant
    if (!enabled) {
      const { error: userBotsError } = await supabase
        .from('client_bot_usage')
        .update({ enabled: false })
        .eq('tenant_id', tenantId);

      if (userBotsError) throw userBotsError;
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar autorização dos bots:', error);
    throw error;
  }
}

// Função para verificar se um bot está autorizado no tenant
export async function isBotAuthorizedInTenant(tenantId: string, botId: string) {
  try {
    const supabase = createClientComponentClient();
    
    const { data, error } = await supabase
      .from('super_tenant_bots')
      .select('enabled')
      .match({ tenant_id: tenantId, bot_id: botId })
      .single();

    if (error) throw error;
    return data?.enabled ?? false;
  } catch (error) {
    console.error('Erro ao verificar autorização do bot:', error);
    return false;
  }
}  