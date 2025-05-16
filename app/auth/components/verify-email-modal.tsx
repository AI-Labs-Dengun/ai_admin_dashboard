'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface VerifyEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VerifyEmailModal({ isOpen, onClose }: VerifyEmailModalProps) {
  const router = useRouter();

  const handleClose = () => {
    onClose();
    router.push('/auth/signin');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Verifique seu Email</DialogTitle>
          <DialogDescription>
            Enviamos um link de confirmação para seu email. Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end mt-4">
          <Button onClick={handleClose}>
            Ir para o Login
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 