import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";

export const createChatSummary = async (data: {
  tenant_id: string;
  user_id: string;
  bot_id: string;
  summary: string;
  chat_id: string;
}) => {
  const supabase = createClientComponentClient();
  
  try {
    const { error } = await supabase
      .from("chat_summaries")
      .insert([data]);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Erro ao criar resumo de chat:", error);
    throw error;
  }
};

export const getChatSummaries = async (tenantId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("chat_summaries")
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
    console.error("Erro ao buscar resumos de chat:", error);
    toast.error("Erro ao buscar resumos de chat");
    throw error;
  }
};

export const getChatSummaryDetails = async (summaryId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("chat_summaries")
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
      .match({ id: summaryId })
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Erro ao buscar detalhes do resumo:", error);
    toast.error("Erro ao buscar detalhes do resumo");
    throw error;
  }
}; 