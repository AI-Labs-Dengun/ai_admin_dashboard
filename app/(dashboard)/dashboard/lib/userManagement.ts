import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { NewUser } from "./types";
import toast from "react-hot-toast";
import { checkUserPermissions } from "./authManagement";
import { generateBotToken } from './jwtManagement';

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
          full_name: newUser.full_name,
          company: newUser.company
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
          full_name: newUser.full_name,
          company: newUser.company,
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
    const { error: tenantError } = await supabase.from("super_tenant_users").insert([
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

    // Se o usuário tiver acesso aos bots e bots selecionados, criar as associações
    if (newUser.allow_bot_access && newUser.selected_bots && newUser.selected_bots.length > 0) {
      try {
        // Primeiro, verificar se já existem bots associados ao tenant
        const { data: existingBots } = await supabase
          .from("super_tenant_bots")
          .select("bot_id")
          .eq("tenant_id", newUser.tenant_id);

        // Filtrar apenas os bots que ainda não estão associados
        const existingBotIds = existingBots?.map(bot => bot.bot_id) || [];
        const newBotIds = newUser.selected_bots.filter(botId => !existingBotIds.includes(botId));

        if (newBotIds.length > 0) {
          // Criar associações na tabela super_tenant_bots
          const tenantBotInserts = newBotIds.map(botId => ({
            tenant_id: newUser.tenant_id,
            bot_id: botId,
            enabled: true,
            created_at: new Date().toISOString()
          }));

          const { error: tenantBotError } = await supabase
            .from("super_tenant_bots")
            .insert(tenantBotInserts);

          if (tenantBotError) {
            console.error("Erro ao associar bots ao tenant:", tenantBotError);
            toast.error("Usuário criado, mas houve um erro ao associar alguns bots ao tenant");
          }

          // Criar associações na tabela client_user_bots
          const userBotInserts = newBotIds.map(botId => ({
            user_id: authData.user.id,
            tenant_id: newUser.tenant_id,
            bot_id: botId,
            enabled: true,
            created_at: new Date().toISOString()
          }));

          const { error: userBotError } = await supabase
            .from("client_user_bots")
            .insert(userBotInserts);

          if (userBotError) {
            console.error("Erro ao associar bots ao usuário:", userBotError);
            toast.error("Usuário criado, mas houve um erro ao associar alguns bots ao usuário");
          }
        }
      } catch (error) {
        console.error("Erro ao processar bots:", error);
        toast.error("Usuário criado, mas houve um erro ao processar os bots");
      }
    }

    // Gerar token JWT automaticamente
    const token = await generateBotToken(authData.user.id, newUser.tenant_id);
    
    toast.success("Usuário criado com sucesso!");
    return { userId: authData.user.id, token };
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
      throw new Error("Sem permissão para atualizar limites de tokens");
    }

    const { error } = await supabase
      .from("super_tenant_users")
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