import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { checkTokenBalanceServer, recordTokenUsageServer } from '@/app/(dashboard)/dashboard/lib/tokenManagement';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Verificar autenticação
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      console.error('❌ Erro de autenticação:', authError);
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { botId, tenantId, tokensToTest } = await request.json();
    console.log('📊 Dados do teste:', {
      userId: session.user.id,
      tenantId,
      botId,
      tokensToTest
    });

    // Verificar se o bot existe e pertence ao tenant
    const { data: botData, error: botError } = await supabase
      .from('user_bots_details')
      .select('*')
      .eq('bot_id', botId)
      .eq('tenant_id', tenantId)
      .eq('user_id', session.user.id)
      .single();

    if (botError || !botData) {
      console.error('❌ Erro ao buscar bot:', botError);
      return NextResponse.json(
        { error: 'Bot não encontrado ou sem permissão' },
        { status: 404 }
      );
    }

    console.log('✅ Bot encontrado:', botData);

    // Verificar saldo antes do teste
    console.log('🔍 Verificando saldo antes do teste...');
    const balanceBefore = await checkTokenBalanceServer(session.user.id, tenantId, botId);
    console.log('💰 Saldo antes:', balanceBefore);

    if (!balanceBefore.hasTokens) {
      return NextResponse.json(
        { error: 'Sem tokens disponíveis' },
        { status: 403 }
      );
    }

    // Registrar uso de tokens
    console.log('📝 Registrando uso de tokens...');
    const tokenRecord = await recordTokenUsageServer(
      session.user.id,
      tenantId,
      botId,
      tokensToTest,
      'test'
    );

    if (!tokenRecord) {
      console.error('❌ Falha ao registrar tokens');
      return NextResponse.json(
        { error: 'Falha ao registrar uso de tokens' },
        { status: 500 }
      );
    }

    // Verificar saldo depois do teste
    const balanceAfter = await checkTokenBalanceServer(session.user.id, tenantId, botId);
    console.log('💰 Saldo depois:', balanceAfter);

    return NextResponse.json({
      success: true,
      test: {
        tokensUsed: tokensToTest,
        balanceBefore,
        balanceAfter,
        tokenRecord
      }
    });

  } catch (error) {
    console.error('❌ Erro no teste de tokens:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
} 