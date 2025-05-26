import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/dashboard';

    if (!code) {
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