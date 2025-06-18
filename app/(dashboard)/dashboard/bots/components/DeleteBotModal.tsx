import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSupabase } from "@/app/providers/supabase-provider";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";

const deleteBotSchema = z.object({
  password: z.string().min(1, "Senha é obrigatória"),
});

type DeleteBotFormData = z.infer<typeof deleteBotSchema>;

interface BotUsage {
  tenant_id: string;
  tenant_name: string;
  user_count: number;
}

interface UsageData {
  tenant_id: string;
  super_tenants: {
    name: string;
  };
  user_id: string;
}

interface DeleteBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: {
    id: string;
    name: string;
  } | null;
  onSuccess: () => void;
}

export function DeleteBotModal({ isOpen, onClose, bot, onSuccess }: DeleteBotModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [botUsage, setBotUsage] = useState<BotUsage[]>([]);
  const { supabase } = useSupabase();

  const form = useForm<DeleteBotFormData>({
    resolver: zodResolver(deleteBotSchema),
    defaultValues: {
      password: "",
    },
  });

  const checkBotUsage = async () => {
    if (!bot) return;

    try {
      // Buscar tenants e contagem de usuários ativos
      const { data: usageData, error: usageError } = await supabase
        .from("client_bot_usage")
        .select(`
          tenant_id,
          super_tenants (
            name
          ),
          user_id
        `)
        .eq("bot_id", bot.id)
        .eq("enabled", true);

      if (usageError) {
        console.error("Erro na query:", usageError);
        throw new Error(`Erro ao buscar dados: ${usageError.message}`);
      }

      if (usageData && usageData.length > 0) {
        // Agrupar os dados manualmente
        const usageMap = new Map<string, { tenant_name: string; count: number }>();
        
        usageData.forEach(item => {
          if (!item.super_tenants) return; // Skip if no tenant data
          
          const existing = usageMap.get(item.tenant_id);
          if (existing) {
            existing.count++;
          } else {
            usageMap.set(item.tenant_id, {
              tenant_name: item.super_tenants[0].name,
              count: 1
            });
          }
        });

        const formattedUsage = Array.from(usageMap.entries()).map(([tenant_id, data]) => ({
          tenant_id,
          tenant_name: data.tenant_name,
          user_count: data.count
        }));
        
        setBotUsage(formattedUsage);
        setRequiresPassword(true);
        return;
      }

      // Se não houver usuários ativos, prosseguir com a exclusão
      await handleDeleteBot();
    } catch (error) {
      console.error("Erro ao verificar uso do bot:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao verificar uso do bot");
    }
  };

  const handleDeleteBot = async (password?: string) => {
    if (!bot) return;

    setIsLoading(true);
    try {
      if (requiresPassword && password) {
        // Verificar senha do super_admin
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email || "",
          password: password,
        });

        if (signInError) {
          toast.error("Senha incorreta");
          return;
        }
      }

      // Excluir o bot
      const { error: deleteError } = await supabase
        .from("super_bots")
        .delete()
        .eq("id", bot.id);

      if (deleteError) throw deleteError;

      toast.success("Bot excluído com sucesso!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao excluir bot:", error);
      toast.error("Erro ao excluir bot");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: DeleteBotFormData) => {
    await handleDeleteBot(data.password);
  };

  const totalUsers = botUsage.reduce((acc, curr) => acc + curr.user_count, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Bot</DialogTitle>
          <DialogDescription>
            {requiresPassword ? (
              <div className="space-y-4">
                <p>Este bot está em uso ativo. Para forçar a exclusão, digite sua senha de super-admin.</p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="font-medium">Detalhes de uso:</p>
                  <div className="space-y-2">
                    {botUsage.map((usage) => (
                      <div key={usage.tenant_id} className="flex items-center justify-between">
                        <span>{usage.tenant_name}</span>
                        <Badge variant="secondary">{usage.user_count} usuários</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t">
                    <p className="font-medium">Total de usuários ativos: {totalUsers}</p>
                  </div>
                </div>
              </div>
            ) : (
              `Tem certeza que deseja excluir o bot "${bot?.name}"?`
            )}
          </DialogDescription>
        </DialogHeader>

        {requiresPassword ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha de Super-Admin</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Digite sua senha"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    "Confirmar Exclusão"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={checkBotUsage}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Excluir Bot"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
} 