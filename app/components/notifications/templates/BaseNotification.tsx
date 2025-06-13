import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReactNode } from "react";

export interface BaseNotificationProps {
  id: string;
  type: "bot" | "chat" | "ticket";
  title: string;
  description?: ReactNode;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  notification_data: any;
  onAction?: (action: "accept" | "reject") => void;
}

export function BaseNotification({
  title,
  description,
  status,
  created_at,
  notification_data,
  onAction,
}: BaseNotificationProps) {
  return (
    <div className="p-4 border rounded-lg space-y-2 hover:bg-accent/50 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {format(new Date(created_at), "PPpp", {
              locale: ptBR,
            })}
          </p>
        </div>
        {status === "pending" && onAction && (
          <div className="flex gap-2">
            <button
              onClick={() => onAction("reject")}
              className="px-3 py-1 text-sm border rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              Recusar
            </button>
            <button
              onClick={() => onAction("accept")}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Aceitar
            </button>
          </div>
        )}
      </div>
      {description && <p className="text-sm">{description}</p>}
      <div className="text-sm">
        <pre className="bg-muted p-2 rounded overflow-x-auto">
          {JSON.stringify(notification_data, null, 2)}
        </pre>
      </div>
    </div>
  );
} 