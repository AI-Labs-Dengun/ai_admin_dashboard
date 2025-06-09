import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyBotToken } from '@/app/dashboard/lib/jwtManagement';

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