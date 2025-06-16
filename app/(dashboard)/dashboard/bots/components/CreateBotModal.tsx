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

const createBotSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  contact_email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  max_tokens_per_request: z.number().min(1, "Mínimo de 1 token").default(1000),
  bot_capabilities: z.array(z.string()).min(1, "Pelo menos uma capacidade é obrigatória"),
});

type CreateBotFormData = z.infer<typeof createBotSchema>;

interface CreateBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateBotModal({ isOpen, onClose, onSuccess }: CreateBotModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newCapability, setNewCapability] = useState("");
  const { supabase } = useSupabase();

  const form = useForm<CreateBotFormData>({
    resolver: zodResolver(createBotSchema),
    defaultValues: {
      name: "",
      description: "",
      contact_email: "",
      website: "",
      max_tokens_per_request: 1000,
      bot_capabilities: [],
    },
  });

  const onSubmit = async (data: CreateBotFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("super_bots")
        .insert([{
          name: data.name,
          description: data.description,
          contact_email: data.contact_email,
          website: data.website || null,
          max_tokens_per_request: data.max_tokens_per_request,
          bot_capabilities: data.bot_capabilities,
          is_active: true
        }]);

      if (error) throw error;

      toast.success("Bot criado com sucesso!");
      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao criar bot:", error);
      toast.error("Erro ao criar bot");
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
          <DialogTitle>Criar Novo Bot</DialogTitle>
          <DialogDescription>
            Preencha todos os campos obrigatórios para criar um novo bot.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Bot *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Digite o nome do bot" />
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
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Digite a descrição do bot" />
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
                  <FormLabel>Email de Contato *</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="contato@exemplo.com" />
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
                  <FormLabel>Website (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      placeholder="https://exemplo.com/bot"
                    />
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
                  <FormLabel>Limite de Tokens por Requisição *</FormLabel>
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
              <FormLabel>Capacidades do Bot *</FormLabel>
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
              {form.formState.errors.bot_capabilities && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.bot_capabilities.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Bot"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 