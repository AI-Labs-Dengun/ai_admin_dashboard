export interface Notification {
  id: string;
  type: "chat" | "ticket";
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  notification_data: any;
}

export interface ChatNotification extends Notification {
  type: "chat";
  chat_id: string;
  message: string;
  sender: string;
}

export interface TicketNotification extends Notification {
  type: "ticket";
  ticket_id: string;
  subject: string;
  priority: "low" | "medium" | "high";
} 