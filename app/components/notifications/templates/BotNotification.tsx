import { BaseNotification, BaseNotificationProps } from "./BaseNotification";

interface BotNotificationProps extends Omit<BaseNotificationProps, "type" | "title"> {
  bot_id: string;
  bot_name: string;
  bot_description?: string;
}

export function BotNotification(props: BotNotificationProps) {
  const { bot_name, bot_description, ...rest } = props;

  return (
    <BaseNotification
      {...rest}
      type="bot"
      title={`Nova solicitação de bot: ${bot_name}`}
      description={bot_description}
    />
  );
} 