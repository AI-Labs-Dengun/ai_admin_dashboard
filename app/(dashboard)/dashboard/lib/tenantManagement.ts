import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";

export const createTenant = async (name: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("super_tenants")
      .insert([{ name }])
      .select()
      .single();

    if (error) throw error;

    toast.success("Tenant criado com sucesso!");
    return data;
  } catch (error) {
    console.error("Erro ao criar tenant:", error);
    toast.error("Erro ao criar tenant");
    throw error;
  }
};

export const updateTenant = async (tenantId: string, name: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { error } = await supabase
      .from("super_tenants")
      .update({ name })
      .match({ id: tenantId });

    if (error) throw error;

    toast.success("Tenant atualizado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao atualizar tenant:", error);
    toast.error("Erro ao atualizar tenant");
    throw error;
  }
};

export const deleteTenant = async (tenantId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { error } = await supabase
      .from("super_tenants")
      .delete()
      .match({ id: tenantId });

    if (error) throw error;

    toast.success("Tenant removido com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao excluir tenant:", error);
    toast.error("Erro ao excluir tenant");
    throw error;
  }
};

export const getTenantUsers = async (tenantId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("super_tenant_users")
      .select(`
        *,
        profiles (
          email,
          full_name
        )
      `)
      .match({ tenant_id: tenantId });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Erro ao buscar usuários do tenant:", error);
    toast.error("Erro ao buscar usuários do tenant");
    throw error;
  }
}; 