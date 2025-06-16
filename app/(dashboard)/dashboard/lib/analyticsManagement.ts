import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";

export const getTokenUsageAnalytics = async (tenantId: string, startDate: string, endDate: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("client_bot_usage")
      .select("*")
      .match({ tenant_id: tenantId })
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Erro ao buscar analytics de uso de tokens:", error);
    toast.error("Erro ao buscar analytics de uso de tokens");
    throw error;
  }
};

export const getBotUsageAnalytics = async (tenantId: string, startDate: string, endDate: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("client_bot_usage")
      .select(`
        *,
        super_bots (
          name
        )
      `)
      .match({ tenant_id: tenantId })
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Erro ao buscar analytics de uso de bots:", error);
    toast.error("Erro ao buscar analytics de uso de bots");
    throw error;
  }
};

export const getUserActivityAnalytics = async (tenantId: string, startDate: string, endDate: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("client_bot_usage")
      .select(`
        *,
        profiles (
          email,
          full_name
        )
      `)
      .match({ tenant_id: tenantId })
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Erro ao buscar analytics de atividade dos usuários:", error);
    toast.error("Erro ao buscar analytics de atividade dos usuários");
    throw error;
  }
}; 