import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  try {
    // Verificar se é uma requisição para a página de setup de senha
    if (request.nextUrl.pathname === '/auth/setup-password') {
      return res;
    }

    // Verificar se é uma requisição para o callback
    if (request.nextUrl.pathname === '/auth/callback') {
      return res;
    }

    // Verificar se é uma requisição para a página de login
    if (request.nextUrl.pathname === '/auth/signin') {
      // Verificar se tem token de acesso no hash
      const hash = request.url.split('#')[1];
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        if (accessToken && refreshToken) {
          // Criar sessão com o token
          const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            console.error('Erro ao criar sessão:', sessionError);
            return res;
          }

          if (session?.user?.user_metadata?.needs_password_setup) {
            // Redirecionar para setup de senha
            const response = NextResponse.redirect(new URL('/auth/setup-password', request.url));
            // Copiar os cookies da sessão
            res.cookies.getAll().forEach(cookie => {
              response.cookies.set(cookie.name, cookie.value);
            });
            return response;
          }
        }
      }
    }

    // Verificar sessão atual
    const { data: { session } } = await supabase.auth.getSession();

    // Se tiver sessão e precisar definir senha, redirecionar
    if (session?.user?.user_metadata?.needs_password_setup) {
      return NextResponse.redirect(new URL('/auth/setup-password', request.url));
    }

    return res;
  } catch (error) {
    console.error('Erro no middleware:', error);
    return res;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 