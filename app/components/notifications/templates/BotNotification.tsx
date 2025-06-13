import { useState } from "react";
import { BaseNotificationProps } from "./BaseNotification";
import { ChevronDown, ChevronUp } from "lucide-react";

interface BotNotificationProps extends Omit<BaseNotificationProps, "type" | "title"> {
  bot_id?: string;
  request_id?: string;
  bot_name: string;
  bot_description?: string;
  status: "pending" | "approved" | "rejected";
}

export function BotNotification(props: BotNotificationProps) {
  const { bot_name, bot_description, notification_data, created_at, status, onAction, ...rest } = props;
  const [showDetails, setShowDetails] = useState(false);

  const getNotificationDetails = () => {
    const details = [];
    if (notification_data?.capabilities) {
      details.push(`Capacidades: ${notification_data.capabilities.join(', ')}`);
    }
    if (notification_data?.contactEmail) {
      details.push(`Email: ${notification_data.contactEmail}`);
    }
    if (notification_data?.website) {
      details.push(`Website: ${notification_data.website}`);
    }
    if (props.request_id) {
      details.push(`Solicitação: ${props.request_id}`);
    }
    return details;
  };

  const details = getNotificationDetails();

  return (
    <div className="p-4 border rounded-lg space-y-3 bg-background shadow-md hover:bg-accent/50 transition-colors">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground font-medium">
          {new Date(created_at).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
        <h3 className="font-bold text-lg text-primary">{bot_name}</h3>
        {bot_description && (
          <p className="text-sm text-muted-foreground mb-1">{bot_description}</p>
        )}
        {details.length > 0 && (
          <ul className="text-sm space-y-1 mb-2">
            {details.map((detail, index) => (
              <li key={index} className="text-muted-foreground">{detail}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        {status === "pending" && onAction && (
          <>
            <button
              onClick={() => onAction("reject")}
              className="flex-1 px-3 py-2 text-sm border border-destructive text-destructive rounded-md hover:bg-destructive/10 transition-colors font-semibold"
            >
              Recusar
            </button>
            <button
              onClick={() => onAction("accept")}
              className="flex-1 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
            >
              Aceitar
            </button>
          </>
        )}
      </div>
      <div>
        <button
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
          onClick={() => setShowDetails((v) => !v)}
        >
          {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showDetails ? 'Esconder detalhes técnicos' : 'Ver detalhes técnicos'}
        </button>
        {showDetails && (
          <pre className="bg-muted p-2 rounded overflow-x-auto text-xs mt-2">
            {JSON.stringify(notification_data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
} 