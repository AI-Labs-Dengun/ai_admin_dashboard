'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSupabase } from '@/app/providers/supabase-provider';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Verificando autenticação...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao verificar sessão:', error);
          setIsAuthenticated(false);
          if (pathname !== '/auth/setup-password') {
            router.replace('/auth/signin');
          }
          return;
        }

        if (!session) {
          console.log('Nenhuma sessão encontrada');
          setIsAuthenticated(false);
          if (pathname !== '/auth/setup-password') {
            router.replace('/auth/signin');
          }
          return;
        }

        // Verificar se o usuário precisa definir a senha
        const needsPasswordSetup = session.user.user_metadata?.needs_password_setup;
        if (needsPasswordSetup && pathname !== '/auth/setup-password') {
          console.log('Usuário precisa definir senha');
          router.replace('/auth/setup-password');
          return;
        }

        console.log('Sessão válida encontrada');
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Erro na verificação de autenticação:', error);
        setIsAuthenticated(false);
        if (pathname !== '/auth/setup-password') {
          router.replace('/auth/signin');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Inscrever-se para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Mudança no estado de autenticação:', event);
      
      if (event === 'SIGNED_OUT' || !session) {
        console.log('Usuário deslogado ou sessão inválida');
        setIsAuthenticated(false);
        if (pathname !== '/auth/setup-password') {
          router.replace('/auth/signin');
        }
      } else {
        // Verificar se o usuário precisa definir a senha
        const needsPasswordSetup = session.user.user_metadata?.needs_password_setup;
        if (needsPasswordSetup && pathname !== '/auth/setup-password') {
          console.log('Usuário precisa definir senha');
          router.replace('/auth/setup-password');
          return;
        }
        
        console.log('Usuário autenticado');
        setIsAuthenticated(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="space-y-6 p-8 rounded-lg border border-border bg-card shadow-sm">
          <div className="flex justify-center">
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-[280px]" />
            <Skeleton className="h-4 w-[220px] mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/auth/setup-password') {
    console.log('Usuário não autenticado, redirecionando...');
    return null;
  }

  return <>{children}</>;
} 