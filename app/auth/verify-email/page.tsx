'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function VerifyEmail() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Verifique seu Email</CardTitle>
          <CardDescription>
            Enviamos um link de confirmação para seu email. Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-center">
            <Link href="/auth/signin" className="text-primary hover:underline">
              Voltar para o login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 