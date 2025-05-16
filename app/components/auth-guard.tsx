'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/app/providers/supabase-provider';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/signin');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/auth/signin');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/auth/signin');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

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

  return <>{children}</>;
} 