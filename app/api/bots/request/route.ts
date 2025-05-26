import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BotRequest, BotRequestResponse } from 'dengun_ai-admin-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const botRequest: BotRequest = await request.json();

    // Verificar se já existe uma solicitação pendente para este bot
    const { data: existingRequest } = await supabase
      .from('bot_requests')
      .select('*')
      .eq('bot_name', botRequest.botName)
      .single();

    if (existingRequest) {
      if (existingRequest.attempts >= 5) {
        return NextResponse.json({
          requestId: existingRequest.id,
          status: 'rejected',
          attempts: existingRequest.attempts,
          message: 'Número máximo de tentativas excedido'
        } as BotRequestResponse, { status: 400 });
      }

      // Atualizar tentativa existente
      const { data: updatedRequest } = await supabase
        .from('bot_requests')
        .update({
          attempts: existingRequest.attempts + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRequest.id)
        .select()
        .single();

      return NextResponse.json({
        requestId: updatedRequest.id,
        status: updatedRequest.status,
        attempts: updatedRequest.attempts
      } as BotRequestResponse);
    }

    // Criar nova solicitação
    const { data: newRequest } = await supabase
      .from('bot_requests')
      .insert({
        bot_name: botRequest.botName,
        bot_description: botRequest.botDescription,
        bot_version: botRequest.botVersion,
        bot_capabilities: botRequest.botCapabilities,
        contact_email: botRequest.contactEmail,
        website: botRequest.website,
        max_tokens_per_request: botRequest.maxTokensPerRequest,
        status: 'pending',
        attempts: 1
      })
      .select()
      .single();

    return NextResponse.json({
      requestId: newRequest.id,
      status: 'pending',
      attempts: 1
    } as BotRequestResponse);
  } catch (error) {
    console.error('Erro ao processar solicitação de bot:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'ID da solicitação não fornecido' },
        { status: 400 }
      );
    }

    const { data: botRequest } = await supabase
      .from('bot_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!botRequest) {
      return NextResponse.json(
        { error: 'Solicitação não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      requestId: botRequest.id,
      status: botRequest.status,
      attempts: botRequest.attempts,
      message: botRequest.message
    } as BotRequestResponse);
  } catch (error) {
    console.error('Erro ao buscar status da solicitação:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar status da solicitação' },
      { status: 500 }
    );
  }
} 