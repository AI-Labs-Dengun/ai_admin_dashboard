export interface Notification {
  id: string;
  type: "bot" | "chat" | "ticket";
  status: "pending" | "approved" | "rejected";
  created_at: string;
  notification_data: any;
}

export interface BotRequest {
  id: string;
  bot_name: string;
  bot_description?: string;
  bot_capabilities?: string[];
  contact_email?: string;
  website?: string;
  max_tokens_per_request?: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at?: string;
  message?: string;
}

export interface BotNotification {
  id: string;
  type: "bot";
  status: "pending" | "approved" | "rejected";
  created_at: string;
  bot_id: string;
  request_id: string;
  bot_name: string;
  bot_description?: string;
  notification_data: {
    requestId: string;
    type: "bot_request";
    status: "pending" | "approved" | "rejected";
    capabilities: string[];
    contactEmail?: string;
    website?: string;
    max_tokens_per_request: number;
  };
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