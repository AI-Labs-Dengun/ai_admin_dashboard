import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/dashboard';
    const type = requestUrl.searchParams.get('type');

    // Se não tiver código, verifica se tem token de acesso no hash
    if (!code) {
      const hash = requestUrl.hash;
      if (hash && hash.includes('access_token')) {
        // Extrair o token do hash
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        
        if (accessToken) {
          const cookieStore = cookies();
          const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
          
          // Verificar se o usuário precisa definir senha
          const { data: { user }, error } = await supabase.auth.getUser(accessToken);
          
          if (error) {
            console.error('Erro ao verificar usuário:', error);
            return NextResponse.redirect(new URL('/auth/signin', request.url));
          }

          if (user?.user_metadata?.needs_password_setup) {
            return NextResponse.redirect(new URL('/auth/setup-password', requestUrl.origin));
          }

          return NextResponse.redirect(new URL(next, requestUrl.origin));
        }
      }
      
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Trocar o código por uma sessão
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Erro ao trocar código por sessão:', error);
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    if (!session) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Verificar se o usuário precisa definir senha
    if (session.user.user_metadata?.needs_password_setup) {
      return NextResponse.redirect(new URL('/auth/setup-password', requestUrl.origin));
    }

    // Se não precisar definir senha, redireciona para o dashboard
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } catch (error) {
    console.error('Erro no callback de autenticação:', error);
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
} 