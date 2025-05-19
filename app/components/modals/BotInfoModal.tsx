import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BotInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
  } | null;
}

export function BotInfoModal({ isOpen, onClose, bot }: BotInfoModalProps) {
  if (!bot) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{bot.name}</DialogTitle>
          <DialogDescription>
            Informações detalhadas do bot
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <h4 className="font-medium">Descrição</h4>
            <p className="text-sm text-muted-foreground">
              {bot.description || "Sem descrição"}
            </p>
          </div>
          <div className="grid gap-2">
            <h4 className="font-medium">Data de Criação</h4>
            <p className="text-sm text-muted-foreground">
              {new Date(bot.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 