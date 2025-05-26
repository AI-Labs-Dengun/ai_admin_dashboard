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
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [canSetupPassword, setCanSetupPassword] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erro ao obter sessão:', sessionError);
          setError('Erro ao verificar sessão.');
          router.push('/auth/signin');
          return;
        }

        if (!session) {
          setCanSetupPassword(false);
          router.push('/auth/signin');
          return;
        }

        // Verificar se o usuário realmente precisa definir senha
        if (!session.user.user_metadata?.needs_password_setup) {
          router.push('/dashboard');
          return;
        }

        setCanSetupPassword(true);
        
        // Carregar dados do usuário se existirem
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', session.user.id)
          .single();
        
        if (profileError) {
          console.error('Erro ao carregar perfil:', profileError);
          setError('Erro ao carregar dados do perfil.');
          return;
        }
        
        if (profile) {
          setFullName(profile.full_name || '');
          setPhone(profile.phone || '');
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        setError('Erro ao verificar sessão.');
        router.push('/auth/signin');
      } finally {
        setIsInitializing(false);
      }
    };
    checkSession();
  }, [router, supabase]);

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

    if (!fullName.trim()) {
      setError('O nome completo é obrigatório');
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      // Atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: {
          needs_password_setup: false
        }
      });

      if (updateError) {
        console.error('Erro ao atualizar senha:', updateError);
        throw updateError;
      }

      // Atualizar perfil com nome e telefone
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (profileError) {
        console.error('Erro ao atualizar perfil:', profileError);
        throw profileError;
      }

      toast.success('Perfil atualizado com sucesso! Você já pode acessar o sistema.');
      router.push('/dashboard');
      router.refresh(); // Força a atualização da página
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

  if (!canSetupPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Link inválido ou expirado</CardTitle>
            <CardDescription>
              Você precisa acessar o link enviado por e-mail para definir sua senha. Solicite um novo link caso necessário.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Complete seu Perfil</CardTitle>
          <CardDescription>
            Defina sua senha e complete seus dados para acessar o sistema
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
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Digite seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Digite seu telefone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha *</Label>
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
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
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
                {loading ? 'Salvando...' : 'Salvar e Acessar'}
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