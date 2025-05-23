'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

function SetupPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [canSetupPassword, setCanSetupPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Capturar code e type da URL (enviados pelo Supabase)
        const code = searchParams.get('code');
        const type = searchParams.get('type');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        console.log('Código recebido:', code);
        console.log('Type:', type);
        console.log('Erro:', error);
        
        // Verificar se há erro na URL
        if (error) {
          console.error('Erro na URL:', error, errorDescription);
          setError(errorDescription || 'Link inválido ou expirado.');
          setIsInitializing(false);
          return;
        }

        if (!code) {
          console.error('Código não encontrado na URL');
          setError('Link inválido ou expirado.');
          setIsInitializing(false);
          return;
        }

        try {
          // Verificar o código usando verifyOtp
          const { data: { session: newSession }, error: verifyError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (verifyError) {
            console.error('Erro ao verificar código:', verifyError);
            setError('Link inválido ou expirado. Por favor, solicite um novo link.');
            setIsInitializing(false);
            return;
          }

          if (!newSession) {
            console.error('Nenhuma sessão retornada após verificação do código');
            setError('Erro ao processar o link. Por favor, tente novamente.');
            setIsInitializing(false);
            return;
          }

          console.log('Código verificado com sucesso, sessão criada:', newSession);
          setCanSetupPassword(true);
        } catch (error) {
          console.error('Erro ao processar código:', error);
          setError('Erro ao processar o link. Por favor, tente novamente.');
          setIsInitializing(false);
          return;
        }
      } catch (error) {
        console.error('Erro ao inicializar sessão:', error);
        setError('Erro ao inicializar sessão.');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSession();
  }, [router, supabase, searchParams]);

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('Erro ao atualizar senha:', updateError);
        throw updateError;
      }

      toast.success('Senha definida com sucesso! Você já pode acessar o sistema.');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Erro ao definir senha:', error);
      setError(error.message || 'Erro ao definir senha');
      toast.error('Erro ao definir senha');
    } finally {
      setLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[350px]">
          <CardContent className="p-6">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Definir Senha</CardTitle>
          <CardDescription>
            Defina sua senha para acessar o sistema pela primeira vez
          </CardDescription>
        </CardHeader>
        {error && (
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        )}
        {canSetupPassword && (
          <form onSubmit={handleSetupPassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirme sua nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Definindo senha...' : 'Definir Senha'}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[350px]">
        <CardContent className="p-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetupPassword() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SetupPasswordContent />
    </Suspense>
  );
} 