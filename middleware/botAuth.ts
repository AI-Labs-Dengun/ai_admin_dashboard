import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';

export async function botAuthMiddleware(request: NextRequest) {
  try {
    // Verificar se é uma requisição para a API de bots
    if (!request.nextUrl.pathname.startsWith('/api/bots')) {
      return NextResponse.next();
    }

    // Obter o token do header Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyBotToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Adicionar informações do token ao request
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-tenant-id', payload.tenantId);
    requestHeaders.set('x-token-limit', payload.tokenLimit.toString());
    requestHeaders.set('x-allow-bot-access', payload.allowBotAccess.toString());
    requestHeaders.set('x-bot-access', JSON.stringify(payload.botAccess));

    // Continuar com a requisição
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Erro na autenticação do bot:', error);
    return NextResponse.json(
      { error: 'Erro na autenticação' },
      { status: 500 }
    );
  }
} 