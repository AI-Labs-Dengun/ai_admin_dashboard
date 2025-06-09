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
    if (!data.error_message) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    // Registrar erro
    const { data: errorLog, error } = await supabase
      .from('bot_errors')
      .insert({
        bot_id: botId,
        tenant_id: tenantId,
        error_message: data.error_message,
        error_code: data.error_code,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar erro do bot:', error);
      return NextResponse.json(
        { error: 'Erro ao registrar erro do bot' },
        { status: 500 }
      );
    }

    // Atualizar status do bot para erro
    await supabase
      .from('bot_status')
      .upsert({
        bot_id: botId,
        tenant_id: tenantId,
        status: 'error',
        last_updated: new Date().toISOString()
      });

    return NextResponse.json({ success: true, data: errorLog });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 