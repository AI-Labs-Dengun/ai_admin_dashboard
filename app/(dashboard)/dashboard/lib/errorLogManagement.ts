import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";

export const createErrorLog = async (data: {
  tenant_id: string;
  user_id: string;
  bot_id: string;
  error_message: string;
  error_type: string;
  stack_trace?: string;
}) => {
  const supabase = createClientComponentClient();
  
  try {
    const { error } = await supabase
      .from("error_logs")
      .insert([data]);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Erro ao registrar log de erro:", error);
    throw error;
  }
};

export const getErrorLogs = async (tenantId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("error_logs")
      .select(`
        *,
        profiles (
          email,
          full_name
        ),
        bots (
          name
        )
      `)
      .match({ tenant_id: tenantId })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Erro ao buscar logs de erro:", error);
    toast.error("Erro ao buscar logs de erro");
    throw error;
  }
};

export const getErrorLogDetails = async (logId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("error_logs")
      .select(`
        *,
        profiles (
          email,
          full_name
        ),
        bots (
          name
        )
      `)
      .match({ id: logId })
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Erro ao buscar detalhes do log:", error);
    toast.error("Erro ao buscar detalhes do log");
    throw error;
  }
}; 