import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/dashboard';
    const type = requestUrl.searchParams.get('type');

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Se tiver código, trocar por sessão
    if (code) {
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
        // Garantir que a sessão está ativa
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        });

        if (sessionError) {
          console.error('Erro ao definir sessão:', sessionError);
          return NextResponse.redirect(new URL('/auth/signin', request.url));
        }

        return NextResponse.redirect(new URL('/auth/setup-password', requestUrl.origin));
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    // Se não tiver código, verificar se tem token de acesso no hash
    const hash = requestUrl.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      
      if (accessToken) {
        // Verificar se o usuário precisa definir senha
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        
        if (error) {
          console.error('Erro ao verificar usuário:', error);
          return NextResponse.redirect(new URL('/auth/signin', request.url));
        }

        if (user?.user_metadata?.needs_password_setup) {
          // Criar sessão com o token de acesso
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (sessionError) {
            console.error('Erro ao criar sessão:', sessionError);
            return NextResponse.redirect(new URL('/auth/signin', request.url));
          }

          return NextResponse.redirect(new URL('/auth/setup-password', requestUrl.origin));
        }

        return NextResponse.redirect(new URL(next, requestUrl.origin));
      }
    }
    
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  } catch (error) {
    console.error('Erro no callback de autenticação:', error);
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
} 