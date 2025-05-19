import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { NewUser } from "./types";
import toast from "react-hot-toast";

export const createUser = async (newUser: NewUser) => {
  const supabase = createClientComponentClient();
  
  try {
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

    if (authError) throw authError;
    if (!authData.user) throw new Error("Usuário não criado");

    // Depois, associar ao tenant
    const { error: tenantError } = await supabase.from("tenant_users").insert([
      {
        tenant_id: newUser.tenant_id,
        user_id: authData.user.id,
        role: "admin",
        allow_bot_access: newUser.allow_bot_access,
      },
    ]);

    if (tenantError) throw tenantError;

    toast.success("Usuário criado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    toast.error("Erro ao criar usuário");
    throw error;
  }
};

export const deleteUser = async (userId: string, tenantId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { error } = await supabase
      .from("tenant_users")
      .delete()
      .match({ user_id: userId, tenant_id: tenantId });

    if (error) throw error;

    toast.success("Usuário removido com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    toast.error("Erro ao excluir usuário");
    throw error;
  }
};

export const updateTokenLimit = async (userId: string, tenantId: string, limit: number) => {
  const supabase = createClientComponentClient();
  
  try {
    const { error } = await supabase
      .from("tenant_users")
      .update({ token_limit: limit })
      .match({ user_id: userId, tenant_id: tenantId });

    if (error) throw error;

    toast.success("Limite de tokens atualizado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao atualizar limite de tokens:", error);
    toast.error("Erro ao atualizar limite de tokens");
    throw error;
  }
}; 