import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { NewUser } from "./types";
import toast from "react-hot-toast";
import { checkUserPermissions } from "./authManagement";

export async function createUser(newUser: NewUser) {
  const supabase = createClientComponentClient();
  
  try {
    // Verificar se o usuário já existe
    const { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', newUser.email)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    let userId: string;

    if (existingUser) {
      // Se o usuário já existe, usar o ID existente
      userId = existingUser.id;

      // Verificar se o usuário já está associado ao tenant
      const { data: existingTenantUser, error: tenantUserError } = await supabase
        .from('super_tenant_users')
        .select('id')
        .match({ user_id: userId, tenant_id: newUser.tenant_id })
        .single();

      if (tenantUserError && tenantUserError.code !== 'PGRST116') {
        throw tenantUserError;
      }

      if (existingTenantUser) {
        throw new Error('Este usuário já está associado a este tenant');
      }
    } else {
      // Se o usuário não existe, criar um novo
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: 'Temp@123', // Senha temporária
        email_confirm: true,
        user_metadata: {
          full_name: newUser.full_name,
          company: newUser.company
        }
      });

      if (authError) throw authError;
      if (!authUser.user) throw new Error('Erro ao criar usuário');

      userId = authUser.user.id;
    }

    // Associar o usuário ao tenant
    const { error: tenantUserError } = await supabase
      .from('super_tenant_users')
      .insert([{
        user_id: userId,
        tenant_id: newUser.tenant_id,
        role: 'admin',
        allow_bot_access: newUser.allow_bot_access,
        interactions_limit: newUser.interactions_limit
      }]);

    if (tenantUserError) throw tenantUserError;

    // Criar associações com bots
    if (newUser.selected_bots && newUser.selected_bots.length > 0) {
      const botInserts = newUser.selected_bots.map(botId => ({
        user_id: userId,
        tenant_id: newUser.tenant_id,
        bot_id: botId,
        enabled: newUser.allow_bot_access,
        created_at: new Date().toISOString()
      }));

      const { error: botError } = await supabase
        .from('client_bot_usage')
        .insert(botInserts);

      if (botError) throw botError;
    }

    return { id: userId };
  } catch (error) {
    console.error('Erro ao criar/associar usuário:', error);
    throw error;
  }
}

export const deleteUser = async (userId: string, tenantId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    // Verificar permissões
    const permissions = await checkUserPermissions();
    if (!permissions?.isSuperAdmin) {
      throw new Error("Sem permissão para excluir usuários");
    }

    // Primeiro, remover do super_tenant_users
    const { error: tenantError } = await supabase
      .from("super_tenant_users")
      .delete()
      .match({ user_id: userId, tenant_id: tenantId });

    if (tenantError) throw tenantError;

    // Depois, remover o perfil
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) throw profileError;

    toast.success("Usuário removido com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao excluir usuário");
    throw error;
  }
};

export const updateTokenLimit = async (userId: string, tenantId: string, newLimit: number) => {
  const supabase = createClientComponentClient();
  
  try {
    // Verificar permissões
    const permissions = await checkUserPermissions();
    if (!permissions?.isSuperAdmin) {
      throw new Error("Sem permissão para atualizar limites de interações");
    }

    const { error } = await supabase
      .from("super_tenant_users")
      .update({ interactions_limit: newLimit })
      .match({ user_id: userId, tenant_id: tenantId });

    if (error) throw error;

    toast.success("Limite de interações atualizado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao atualizar limite de interações:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao atualizar limite de interações");
    throw error;
  }
}; 