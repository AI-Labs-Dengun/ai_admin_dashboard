import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');

    if (code) {
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Erro ao trocar código por sessão:', error);
        return NextResponse.redirect(new URL('/auth/signin', request.url));
      }

      // Aqui você pode checar se o usuário precisa definir a senha
      // Por exemplo, usando um campo no user_metadata ou outro critério
      // Exemplo:
      if (session?.user?.last_sign_in_at === null) {
        // Primeiro acesso, redireciona para setup-password
        return NextResponse.redirect(new URL('/auth/setup-password', requestUrl.origin));
      }
    }

    // Se não for o primeiro acesso, redireciona para o dashboard
    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
  } catch (error) {
    console.error('Erro no callback de autenticação:', error);
    // Em caso de erro, redireciona para a página de login
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
} 