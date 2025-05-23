import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "react-hot-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

async function generateCodeChallenge() {
  const encoder = new TextEncoder();
  const data = encoder.encode(Math.random().toString(36).slice(-8));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    company: "",
    is_super_admin: false,
  });

  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkSuperAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .single();
        
        setIsSuperAdmin(profile?.is_super_admin || false);
      }
    };
    checkSuperAdmin();
  }, []);

  const handleSuperAdminToggle = (checked: boolean) => {
    if (checked) {
      setShowPasswordConfirm(true);
    } else {
      setShowPasswordConfirm(false);
      setAdminPassword("");
    }
    setNewUser({ ...newUser, is_super_admin: checked });
  };

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

  const handleCreateUser = async () => {
    try {
      setIsSaving(true);

      // Verificar se é super admin
      if (!isSuperAdmin) {
        toast.error('Apenas super admins podem criar usuários');
        setIsSaving(false);
        return;
      }

      // Se for super admin, verificar a senha primeiro
      if (newUser.is_super_admin) {
        const isPasswordValid = await verifyAdminPassword();
        if (!isPasswordValid) {
          setIsSaving(false);
          return;
        }
      }

      // Verificar se o email já existe
      const { data: existingUser, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newUser.email)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw userError;
      }

      if (existingUser) {
        toast.error('Este email já está cadastrado');
        return;
      }

      // Criar o usuário no auth com senha temporária
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: Math.random().toString(36).slice(-8), // Senha temporária
        email_confirm: true,
        user_metadata: {
          full_name: newUser.full_name,
          company: newUser.company,
          is_super_admin: newUser.is_super_admin,
          needs_password_setup: true // Flag para indicar que precisa definir senha
        }
      });

      if (authError) {
        console.error('Erro ao criar usuário:', authError);
        toast.error('Erro ao criar usuário. Tente novamente.');
        return;
      }

      if (!authData.user) {
        throw new Error('Não foi possível criar o usuário');
      }

      // Enviar email de recuperação de senha
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(newUser.email, {
        redirectTo: `${window.location.origin}/auth/setup-password`
      });

      if (recoveryError) {
        console.error('Erro ao enviar email de recuperação:', recoveryError);
        toast.error('Erro ao enviar email de recuperação.');
        return;
      }

      toast.success('Usuário criado com sucesso! Um email foi enviado para definir a senha.');
      
      // Limpar o formulário
      setNewUser({
        email: "",
        full_name: "",
        company: "",
        is_super_admin: false,
      });
      setAdminPassword("");
      setShowPasswordConfirm(false);
      
      await onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      toast.error('Erro ao criar usuário');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo usuário no sistema. Um email será enviado para definir a senha.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input
              id="full_name"
              value={newUser.full_name}
              onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
              placeholder="Digite o nome completo"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="company">Empresa</Label>
            <Input
              id="company"
              value={newUser.company}
              onChange={(e) => setNewUser({ ...newUser, company: e.target.value })}
              placeholder="Digite o nome da empresa"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_super_admin"
              checked={newUser.is_super_admin}
              onCheckedChange={handleSuperAdminToggle}
            />
            <Label htmlFor="is_super_admin">Super Admin</Label>
          </div>

          {showPasswordConfirm && (
            <>
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Para criar um Super Admin, confirme sua senha atual.
                </AlertDescription>
              </Alert>
              <div className="grid gap-2">
                <Label htmlFor="admin_password">Sua Senha</Label>
                <Input
                  id="admin_password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreateUser}
            disabled={
              isSaving || 
              !newUser.email || 
              !newUser.full_name || 
              (newUser.is_super_admin && !adminPassword)
            }
          >
            {isSaving ? "Criando..." : "Criar Usuário"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 