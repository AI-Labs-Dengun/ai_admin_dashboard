"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const supabase = createClientComponentClient();

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "A senha deve ter pelo menos 8 caracteres";
    }
    if (!/[A-Z]/.test(password)) {
      return "A senha deve conter pelo menos uma letra maiúscula";
    }
    if (!/[a-z]/.test(password)) {
      return "A senha deve conter pelo menos uma letra minúscula";
    }
    if (!/[0-9]/.test(password)) {
      return "A senha deve conter pelo menos um número";
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return "A senha deve conter pelo menos um caractere especial (!@#$%^&*)";
    }
    return "";
  };

  const handlePasswordChange = async () => {
    try {
      setIsSaving(true);
      setErrors({ newPassword: "", confirmPassword: "" });

      // Validar senha
      const passwordError = validatePassword(passwords.newPassword);
      if (passwordError) {
        setErrors(prev => ({ ...prev, newPassword: passwordError }));
        return;
      }

      // Verificar se as senhas coincidem
      if (passwords.newPassword !== passwords.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: "As senhas não coincidem" }));
        return;
      }

      // Atualizar a senha
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword
      });

      if (error) {
        throw error;
      }

      // Atualizar o perfil para marcar que a senha foi alterada
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_changed: true })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (profileError) {
        console.error('Erro ao atualizar perfil:', profileError);
      }

      toast.success('Senha alterada com sucesso!');
      onClose();
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast.error(error.message || 'Erro ao alterar senha');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Alterar Senha</DialogTitle>
          <DialogDescription>
            Por favor, defina uma nova senha para sua conta. Esta senha deve ser forte e segura.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              A senha deve conter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais.
            </AlertDescription>
          </Alert>

          <div className="grid gap-2">
            <Label htmlFor="new_password">Nova Senha</Label>
            <Input
              id="new_password"
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              placeholder="Digite sua nova senha"
            />
            {errors.newPassword && (
              <p className="text-sm text-red-500">{errors.newPassword}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
            <Input
              id="confirm_password"
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              placeholder="Confirme sua nova senha"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            onClick={handlePasswordChange}
            disabled={isSaving || !passwords.newPassword || !passwords.confirmPassword}
          >
            {isSaving ? "Alterando..." : "Alterar Senha"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 