'use client';

/*
 * Sistema de Signup temporariamente desativado
 * Para reativar, remova os comentários deste arquivo
 */

/*
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignUp = async (e: React.FormEvent) => {
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
      // Criar usuário no Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company: company,
            is_super_admin: true
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (authData.user) {
        console.log('Usuário criado:', authData.user);

        // Criar perfil diretamente na tabela profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              email: email,
              full_name: fullName,
              company: company,
              is_super_admin: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
          throw profileError;
        }

        console.log('Perfil criado:', profileData);

        // Verificar se o perfil foi criado corretamente
        const { data: verifyProfile, error: verifyError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (verifyError) {
          console.error('Erro ao verificar perfil:', verifyError);
          throw verifyError;
        }

        console.log('Perfil verificado:', verifyProfile);

        // Fazer login automaticamente após criar a conta
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error('Erro ao fazer login automático:', signInError);
          toast.error('Erro ao fazer login automático. Por favor, faça login manualmente.');
          router.push('/auth/signin');
        } else {
          console.log('Login automático realizado:', signInData);
          toast.success('Conta criada com sucesso!');
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Erro ao criar conta:', error);
      setError(error.message || 'Erro ao criar conta');
      toast.error('Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Criar Conta</CardTitle>
          <CardDescription>
            Preencha os dados abaixo para criar sua conta
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

        <form onSubmit={handleSignUp}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                type="text"
                placeholder="Nome da sua empresa"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
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
                placeholder="Confirme sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
            <div className="text-sm text-center">
              Já tem uma conta?{' '}
              <Link href="/auth/signin" className="text-primary hover:underline">
                Faça login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
*/

// Página temporariamente desativada
export default function SignUp() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Sistema de Cadastro Desativado</CardTitle>
          <CardDescription>
            O sistema de cadastro está temporariamente indisponível.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
} 