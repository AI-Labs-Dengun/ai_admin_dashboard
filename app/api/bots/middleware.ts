import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyBotToken } from '@/app/dashboard/lib/jwtManagement';

export async function botMiddleware(request: NextRequest) {
  try {
    // Obter token da URL ou do header
    const token = request.nextUrl.searchParams.get('token') || 
                 request.headers.get('x-bot-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    // Validar token
    const tokenData = await verifyBotToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Adicionar dados do token ao request
    const requestWithToken = new NextRequest(request.url, {
      headers: request.headers,
      method: request.method,
      body: request.body,
      cache: request.cache,
      credentials: request.credentials,
      integrity: request.integrity,
      keepalive: request.keepalive,
      mode: request.mode,
      redirect: request.redirect,
      referrer: request.referrer,
      referrerPolicy: request.referrerPolicy,
      signal: request.signal,
    });

    // Adicionar dados do token como headers
    requestWithToken.headers.set('x-bot-user-id', tokenData.userId);
    requestWithToken.headers.set('x-bot-tenant-id', tokenData.tenantId);
    requestWithToken.headers.set('x-bot-id', tokenData.botId);

    return requestWithToken;
  } catch (error) {
    console.error('Erro no middleware do bot:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
} 