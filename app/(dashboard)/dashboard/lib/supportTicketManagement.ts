import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";

export const createSupportTicket = async (data: {
  title: string;
  description: string;
  tenant_id: string;
  user_id: string;
  priority: "low" | "medium" | "high";
}) => {
  const supabase = createClientComponentClient();
  
  try {
    const { error } = await supabase
      .from("support_tickets")
      .insert([{
        ...data,
        status: "open"
      }]);

    if (error) throw error;

    toast.success("Ticket criado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao criar ticket:", error);
    toast.error("Erro ao criar ticket");
    throw error;
  }
};

export const updateTicketStatus = async (ticketId: string, status: "open" | "in_progress" | "closed") => {
  const supabase = createClientComponentClient();
  
  try {
    const { error } = await supabase
      .from("support_tickets")
      .update({ status })
      .match({ id: ticketId });

    if (error) throw error;

    toast.success("Status do ticket atualizado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao atualizar status do ticket:", error);
    toast.error("Erro ao atualizar status do ticket");
    throw error;
  }
};

export const addTicketComment = async (data: {
  ticket_id: string;
  user_id: string;
  content: string;
}) => {
  const supabase = createClientComponentClient();
  
  try {
    const { error } = await supabase
      .from("ticket_comments")
      .insert([data]);

    if (error) throw error;

    toast.success("Comentário adicionado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao adicionar comentário:", error);
    toast.error("Erro ao adicionar comentário");
    throw error;
  }
};

export const getTicketDetails = async (ticketId: string) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from("support_tickets")
      .select(`
        *,
        profiles (
          email,
          full_name
        ),
        ticket_comments (
          *,
          profiles (
            email,
            full_name
          )
        )
      `)
      .match({ id: ticketId })
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Erro ao buscar detalhes do ticket:", error);
    toast.error("Erro ao buscar detalhes do ticket");
    throw error;
  }
}; 