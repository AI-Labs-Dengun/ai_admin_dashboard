import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Se o usuário não estiver autenticado e tentar acessar uma rota protegida
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/auth/signin';
    redirectUrl.searchParams.set(`redirectedFrom`, req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Se o usuário estiver autenticado e tentar acessar páginas de auth
  if (session && (req.nextUrl.pathname.startsWith('/auth'))) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}; 