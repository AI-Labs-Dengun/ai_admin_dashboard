import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    console.log('🐛 Recebendo relatórios de erro');

    // Verificar autenticação do bot
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const botAuth = await verifyBotToken(token);

    if (!botAuth) {
      return NextResponse.json(
        { success: false, error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    const { botId, errors } = await request.json();

    if (!botId || !errors || !Array.isArray(errors)) {
      return NextResponse.json(
        { success: false, error: 'botId e errors (array) são obrigatórios' },
        { status: 400 }
      );
    }

    console.log(`🐛 Processando ${errors.length} relatórios de erro para bot:`, botId);

    // Processar cada erro
    const insertData = [];
    
    for (const errorRecord of errors) {
      const {
        sessionId,
        userId,
        tenantId,
        error: errorMessage,
        errorCode,
        stack,
        context,
        timestamp
      } = errorRecord;

      if (!errorMessage || !timestamp) {
        console.warn('⚠️ Relatório de erro inválido:', errorRecord);
        continue;
      }

      insertData.push({
        bot_id: botId,
        user_id: userId || null,
        tenant_id: tenantId || null,
        session_id: sessionId || null,
        error_message: errorMessage,
        error_code: errorCode || 'UNKNOWN_ERROR',
        stack_trace: stack || null,
        context: context || {},
        created_at: new Date(timestamp).toISOString()
      });
    }

    if (insertData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum erro válido encontrado' },
        { status: 400 }
      );
    }

    // Inserir relatórios de erro
    const { data: insertResult, error: insertError } = await supabase
      .from('bot_errors')
      .insert(insertData)
      .select();

    if (insertError) {
      console.error('❌ Erro ao inserir relatórios de erro:', insertError);
      return NextResponse.json(
        { success: false, error: 'Erro ao salvar relatórios de erro' },
        { status: 500 }
      );
    }

    console.log(`✅ ${insertResult.length} relatórios de erro salvos`);

    // Verificar se há erros críticos para atualizar status do bot
    const criticalErrors = insertData.filter(err => 
      err.error_code?.includes('CRITICAL') || 
      err.error_code?.includes('FATAL') ||
      err.error_message?.toLowerCase().includes('critical') ||
      err.error_message?.toLowerCase().includes('fatal')
    );

    if (criticalErrors.length > 0) {
      console.warn(`⚠️ ${criticalErrors.length} erros críticos detectados, atualizando status do bot`);
      
      // Atualizar status do bot para erro se houver erros críticos
      await supabase
        .from('bot_status')
        .upsert({
          bot_id: botId,
          status: 'error',
          last_updated: new Date().toISOString(),
          error_details: {
            criticalErrors: criticalErrors.length,
            lastCriticalError: criticalErrors[criticalErrors.length - 1].error_message
          }
        }, {
          onConflict: 'bot_id'
        });
    }

    return NextResponse.json({
      success: true,
      processed: insertResult.length,
      criticalErrors: criticalErrors.length,
      message: `${insertResult.length} relatórios de erro processados`
    });
  } catch (error) {
    console.error('❌ Erro ao processar relatórios de erro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
} 