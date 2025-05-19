import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { NewUser } from "./types";
import toast from "react-hot-toast";
import { checkUserPermissions } from "./authManagement";

export const createUser = async (newUser: NewUser) => {
  const supabase = createClientComponentClient();
  
  try {
    // Verificar permissões
    const permissions = await checkUserPermissions();
    if (!permissions?.isSuperAdmin) {
      throw new Error("Sem permissão para criar usuários");
    }

    // Verificar se o usuário já existe
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", newUser.email)
      .single();

    if (existingUser) {
      throw new Error("Este email já está cadastrado");
    }

    // Primeiro, criar o usuário no auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newUser.email,
      password: "senha_temporaria", // Idealmente, enviar por email
      options: {
        data: {
          role: "admin",
        },
      },
    });

    if (authError) {
      if (authError.message.includes("Too Many Requests")) {
        throw new Error("Muitas tentativas. Por favor, aguarde um minuto e tente novamente.");
      }
      throw authError;
    }
    
    if (!authData.user) throw new Error("Usuário não criado");

    // Aguardar um momento para garantir que o usuário foi criado
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Criar perfil do usuário
    const { error: profileError } = await supabase
      .from("profiles")
      .insert([
        {
          id: authData.user.id,
          email: newUser.email,
          is_super_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

    if (profileError) {
      // Se houver erro ao criar o perfil, tentar limpar o usuário do auth
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    // Depois, associar ao tenant
    const { error: tenantError } = await supabase.from("tenant_users").insert([
      {
        tenant_id: newUser.tenant_id,
        user_id: authData.user.id,
        role: "admin",
        allow_bot_access: newUser.allow_bot_access,
        token_limit: 1000000, // Limite padrão de tokens
      },
    ]);

    if (tenantError) {
      // Se houver erro ao associar ao tenant, limpar o perfil e o usuário
      await supabase.from("profiles").delete().eq("id", authData.user.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw tenantError;
    }

    toast.success("Usuário criado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao criar usuário");
    throw error;
  }
};

export const deleteUser = async (userId: string, tenantId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    // Verificar permissões
    const permissions = await checkUserPermissions();
    if (!permissions?.isSuperAdmin) {
      throw new Error("Sem permissão para excluir usuários");
    }

    // Primeiro, remover do tenant_users
    const { error: tenantError } = await supabase
      .from("tenant_users")
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
      throw new Error("Sem permissão para atualizar limites de tokens");
    }

    const { error } = await supabase
      .from("tenant_users")
      .update({ token_limit: newLimit })
      .match({ user_id: userId, tenant_id: tenantId });

    if (error) throw error;

    toast.success("Limite de tokens atualizado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao atualizar limite de tokens:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao atualizar limite de tokens");
    throw error;
  }
}; 