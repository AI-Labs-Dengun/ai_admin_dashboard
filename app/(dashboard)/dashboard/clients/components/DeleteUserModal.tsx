import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  userToDelete: {
    id: string;
    email: string;
    full_name: string;
  } | null;
}

export function DeleteUserModal({ isOpen, onClose, onSuccess, userToDelete }: DeleteUserModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [linkedTenants, setLinkedTenants] = useState<any[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    const fetchLinkedTenants = async () => {
      if (!userToDelete) return;
      setLoadingLinks(true);
      try {
        // Buscar tenants e bots vinculados ao usuário
        const { data, error } = await supabase
          .from('super_tenant_users')
          .select(`tenant_id, super_tenants(name), client_bot_usage(bot_id, bot_name)`)
          .eq('user_id', userToDelete.id);
        if (error) throw error;
        setLinkedTenants(data || []);
      } catch (err) {
        setLinkedTenants([]);
      } finally {
        setLoadingLinks(false);
      }
    };
    if (isOpen && userToDelete) fetchLinkedTenants();
  }, [isOpen, userToDelete]);

  const verifyAdminPassword = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || "",
        password: adminPassword,
      });

      if (error) {
        toast.error('Senha incorreta');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      toast.error('Erro ao verificar senha');
      return false;
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    // Verificar se está tentando deletar a própria conta
    if (currentUserId === userToDelete.id) {
      toast.error('Você não pode deletar sua própria conta');
      onClose();
      return;
    }

    try {
      setIsDeleting(true);

      // Verificar se é super admin
      const { data: profile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileCheckError) throw profileCheckError;

      if (!profile?.is_super_admin) {
        toast.error('Apenas super admins podem deletar usuários');
        setIsDeleting(false);
        return;
      }

      // Verificar senha do admin
      const isPasswordValid = await verifyAdminPassword();
      if (!isPasswordValid) {
        setIsDeleting(false);
        return;
      }

      // Chamar a API para deletar o usuário
      const response = await fetch('/dashboard/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userToDelete.id, adminId: currentUserId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao deletar usuário');
      }

      toast.success('Usuário deletado com sucesso!');
      await onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      toast.error('Erro ao deletar usuário. Por favor, tente novamente.');
    } finally {
      setIsDeleting(false);
      setAdminPassword("");
    }
  };

  // Se for a própria conta, não renderiza o modal
  if (currentUserId === userToDelete?.id) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Deletar Usuário</DialogTitle>
          <DialogDescription>
            Esta ação é irreversível. Todos os dados do usuário serão permanentemente removidos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você está prestes a deletar o usuário: <strong>{userToDelete?.full_name}</strong> ({userToDelete?.email})
            </AlertDescription>
            {loadingLinks ? (
              <div className="text-sm text-muted-foreground mt-2">Carregando vínculos...</div>
            ) : linkedTenants.length > 0 ? (
              <div className="mt-2 text-sm">
                <strong>Vínculos encontrados:</strong>
                <ul className="list-disc list-inside mt-1">
                  {linkedTenants.map((tenant, idx) => (
                    <li key={tenant.tenant_id + idx}>
                      Tenant: {tenant.super_tenants?.name || tenant.tenant_id}
                      {tenant.client_bot_usage?.length > 0 && (
                        <ul className="ml-4 list-disc">
                          {tenant.client_bot_usage.map((bot: any) => (
                            <li key={bot.bot_id}>Bot: {bot.bot_name || bot.bot_id}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground mt-2">Nenhum vínculo com tenants/bots encontrado.</div>
            )}
          </Alert>

          <div className="grid gap-2">
            <Label htmlFor="admin_password">Confirme sua senha</Label>
            <Input
              id="admin_password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Digite sua senha atual"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteUser}
            disabled={isDeleting || !adminPassword}
          >
            {isDeleting ? "Deletando..." : "Confirmar Exclusão"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 