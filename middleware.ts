import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Lista de rotas protegidas que requerem autenticação
    const protectedRoutes = ['/dashboard', '/profile', '/settings'];
    const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route));

    // Se for uma rota protegida e não houver sessão, redireciona para login
    if (isProtectedRoute && !session) {
      console.log('Rota protegida acessada sem sessão:', req.nextUrl.pathname);
      const redirectUrl = new URL('/auth/signin', req.url);
      redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Se houver sessão e tentar acessar páginas de auth, redireciona para dashboard
    if (session && req.nextUrl.pathname.startsWith('/auth')) {
      console.log('Usuário autenticado tentando acessar página de auth:', req.nextUrl.pathname);
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Se não houver sessão e não for uma rota pública, redireciona para login
    if (!session && !req.nextUrl.pathname.startsWith('/auth')) {
      console.log('Rota não pública acessada sem sessão:', req.nextUrl.pathname);
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    return res;
  } catch (error) {
    console.error('Erro no middleware:', error);
    // Em caso de erro, redireciona para login
    return NextResponse.redirect(new URL('/auth/signin', req.url));
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
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 