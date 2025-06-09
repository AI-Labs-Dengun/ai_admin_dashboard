import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyBotToken } from '@/app/dashboard/lib/jwtManagement';
import { botMiddleware } from '../middleware';
import { TokenService } from '@/app/services/TokenService';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { token, data } = await request.json();

    // Validar token do bot
    const tokenData = await verifyBotToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    const { userId, tenantId, botId } = tokenData;

    // Validar dados recebidos
    if (!data.status) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    // Validar status
    const validStatuses = ['online', 'offline', 'error', 'maintenance'];
    if (!validStatuses.includes(data.status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      );
    }

    // Atualizar status do bot
    const { data: botStatus, error } = await supabase
      .from('bot_status')
      .upsert({
        bot_id: botId,
        tenant_id: tenantId,
        status: data.status,
        last_updated: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar status do bot:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar status do bot' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: botStatus });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Aplicar middleware
    const middlewareResponse = await botMiddleware(request);
    if (middlewareResponse instanceof NextResponse) {
      return middlewareResponse;
    }

    // Obter dados do token do header
    const userId = request.headers.get('x-bot-user-id');
    const tenantId = request.headers.get('x-bot-tenant-id');
    const botId = request.headers.get('x-bot-id');

    if (!userId || !tenantId || !botId) {
      return NextResponse.json(
        { error: 'Dados do usuário não encontrados' },
        { status: 400 }
      );
    }

    // Obter informações de tokens
    const tokenService = TokenService.getInstance();
    const { limit, used, remaining } = await tokenService.checkLimit(
      userId,
      tenantId,
      botId
    );

    // Obter histórico
    const { history } = await tokenService.getHistory(
      userId,
      tenantId,
      botId
    );

    return NextResponse.json({
      success: true,
      status: 'active',
      token_usage: {
        limit,
        used,
        remaining,
        percentage_used: Math.round((used / limit) * 100),
        can_use: remaining > 0
      },
      recent_usage: history.slice(0, 10) // últimos 10 registros
    });
  } catch (error) {
    console.error('Erro ao obter status:', error);
    return NextResponse.json(
      { error: 'Erro ao obter status' },
      { status: 500 }
    );
  }
} 