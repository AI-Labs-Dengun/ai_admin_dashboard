import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";

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