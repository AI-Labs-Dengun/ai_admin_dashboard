'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabase } from '@/app/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const { supabase } = useSupabase();

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const code = searchParams.get('code');
        console.log('Código recebido:', code);

        if (!code) {
          console.error('Nenhum código encontrado na URL');
          setError('Link inválido ou expirado.');
          setIsInitializing(false);
          return;
        }

        // Verificar se já existe uma sessão
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession) {
          // Se não houver sessão, tentar recuperar a sessão com o código
          const { data: { session: newSession }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Erro ao trocar código por sessão:', exchangeError);
            setError('Link inválido ou expirado.');
            setIsInitializing(false);
            return;
          }

          if (!newSession) {
            console.error('Nenhuma sessão retornada após troca de código');
            setError('Link inválido ou expirado.');
            setIsInitializing(false);
            return;
          }

          console.log('Sessão obtida com sucesso:', newSession);

          // Verificar se o usuário precisa definir senha
          if (newSession.user.user_metadata?.needs_password_setup) {
            setCanSetupPassword(true);
          } else {
            console.log('Usuário não precisa definir senha:', newSession.user.user_metadata);
            setError('Este link já foi utilizado ou a senha já foi definida.');
          }
        } else {
          // Se já existe uma sessão, verificar se o usuário precisa definir senha
          if (currentSession.user.user_metadata?.needs_password_setup) {
            setCanSetupPassword(true);
          } else {
            console.log('Usuário não precisa definir senha:', currentSession.user.user_metadata);
            setError('Este link já foi utilizado ou a senha já foi definida.');
          }
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
        password: password,
        data: {
          needs_password_setup: false
        }
      });

      if (updateError) throw updateError;

      toast.success('Senha definida com sucesso!');
      router.push('/auth/signin');
    } catch (error: any) {
      console.error('Erro ao definir senha:', error);
      setError(error.message);
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
            Defina sua senha para acessar o sistema
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
                <Input
                  type="password"
                  placeholder="Nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Confirme a senha"
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