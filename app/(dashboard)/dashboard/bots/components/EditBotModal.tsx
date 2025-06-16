import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSupabase } from "@/app/providers/supabase-provider";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const botSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  contact_email: z.string().email("Email inválido").optional().or(z.literal("")),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  max_tokens_per_request: z.number().min(1, "Mínimo de 1 token"),
  bot_capabilities: z.array(z.string()),
});

type BotFormData = z.infer<typeof botSchema>;

interface EditBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: {
    id: string;
    name: string;
    description: string | null;
    bot_capabilities: string[];
    contact_email: string | null;
    website: string | null;
    max_tokens_per_request: number;
  } | null;
  onSuccess: () => void;
}

export function EditBotModal({ isOpen, onClose, bot, onSuccess }: EditBotModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newCapability, setNewCapability] = useState("");
  const { supabase } = useSupabase();

  const form = useForm<BotFormData>({
    resolver: zodResolver(botSchema),
    defaultValues: {
      name: bot?.name || "",
      description: bot?.description || "",
      contact_email: bot?.contact_email || "",
      website: bot?.website || "",
      max_tokens_per_request: bot?.max_tokens_per_request || 1000,
      bot_capabilities: bot?.bot_capabilities || [],
    },
  });

  const onSubmit = async (data: BotFormData) => {
    if (!bot) return;
    
    setIsLoading(true);
    try {
      // Verificar se o usuário é super admin
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Usuário autenticado:", user);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user?.id)
        .single();

      console.log("Perfil do usuário:", profile);
      if (profileError) {
        console.error("Erro ao verificar perfil:", profileError);
        throw profileError;
      }

      if (!profile?.is_super_admin) {
        throw new Error("Apenas super admins podem editar bots");
      }

      console.log("Atualizando super_bots...");
      // 1. Atualizar o bot na tabela super_bots
      const { error: updateBotError } = await supabase
        .from("super_bots")
        .update({
          name: data.name,
          description: data.description || null,
          contact_email: data.contact_email || null,
          website: data.website || null,
          max_tokens_per_request: data.max_tokens_per_request,
          bot_capabilities: data.bot_capabilities,
          updated_at: new Date().toISOString()
        })
        .eq("id", bot.id);

      if (updateBotError) {
        console.error("Erro ao atualizar super_bots:", updateBotError);
        throw updateBotError;
      }

      console.log("Atualizando client_bot_usage...");
      // 2. Atualizar os registros na tabela client_bot_usage
      const { error: updateUsageError } = await supabase
        .from("client_bot_usage")
        .update({
          bot_name: data.name,
          website: data.website || null,
          updated_at: new Date().toISOString()
        })
        .eq("bot_id", bot.id);

      if (updateUsageError) {
        console.error("Erro ao atualizar client_bot_usage:", updateUsageError);
        throw updateUsageError;
      }

      toast.success("Bot atualizado com sucesso!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar bot:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar bot");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCapability = () => {
    if (!newCapability.trim()) return;
    
    const currentCapabilities = form.getValues("bot_capabilities");
    if (!currentCapabilities.includes(newCapability)) {
      form.setValue("bot_capabilities", [...currentCapabilities, newCapability]);
    }
    setNewCapability("");
  };

  const handleRemoveCapability = (capability: string) => {
    const currentCapabilities = form.getValues("bot_capabilities");
    form.setValue(
      "bot_capabilities",
      currentCapabilities.filter((c) => c !== capability)
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Bot</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de Contato</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input {...field} type="url" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_tokens_per_request"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite de Tokens por Requisição</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel>Capacidades</FormLabel>
              <div className="flex gap-2">
                <Input
                  value={newCapability}
                  onChange={(e) => setNewCapability(e.target.value)}
                  placeholder="Adicionar nova capacidade"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCapability();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCapability}
                >
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.watch("bot_capabilities").map((capability) => (
                  <Badge key={capability} variant="secondary">
                    {capability}
                    <button
                      type="button"
                      onClick={() => handleRemoveCapability(capability)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 