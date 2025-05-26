import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function Home() {
  const supabase = createServerComponentClient({ cookies });
  
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      // Verificar se o usuário precisa definir senha
      if (session.user.user_metadata?.needs_password_setup) {
        redirect('/auth/setup-password');
      }
      redirect('/dashboard');
    }

    // Se não tiver sessão, verificar se tem token de acesso no hash
    const requestUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || '');
    const hash = requestUrl.hash;
    
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      
      if (accessToken) {
        const { data: { user } } = await supabase.auth.getUser(accessToken);
        
        if (user?.user_metadata?.needs_password_setup) {
          redirect('/auth/setup-password');
        }
      }
    }

    redirect('/auth/signin');
  } catch (error) {
    console.error('Error checking auth:', error);
    redirect('/auth/signin');
  }
}
