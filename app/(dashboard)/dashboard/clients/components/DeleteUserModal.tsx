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
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

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

      // 1. Remover todas as associações com bots
      const { error: userBotsError } = await supabase
        .from('user_bots')
        .delete()
        .eq('user_id', userToDelete.id);

      if (userBotsError) throw userBotsError;

      // 2. Remover uso de tokens
      const { error: tokenUsageError } = await supabase
        .from('token_usage')
        .delete()
        .eq('user_id', userToDelete.id);

      if (tokenUsageError) throw tokenUsageError;

      // 3. Remover associações com tenants
      const { error: tenantUsersError } = await supabase
        .from('tenant_users')
        .delete()
        .eq('user_id', userToDelete.id);

      if (tenantUsersError) throw tenantUsersError;

      // 4. Remover o perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (profileError) throw profileError;

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