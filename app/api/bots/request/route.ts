import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';

interface BotRequest {
  name: string;
  description?: string;
  capabilities?: string[];
  contactEmail: string;
  website?: string;
  maxTokensPerRequest?: number;
}

interface BotRequestResponse {
  requestId: string;
  status: 'pending' | 'approved' | 'rejected';
  attempts: number;
  message?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const botRequest: BotRequest = await request.json();

    // Validação dos campos obrigatórios
    if (!botRequest.name || !botRequest.contactEmail) {
      return NextResponse.json(
        { error: 'Nome do bot e email de contato são obrigatórios' },
        { status: 400 }
      );
    }

    console.log('📥 Dados recebidos do bot:', botRequest);

    // Verificar se já existe uma solicitação pendente para este bot
    const { data: existingRequest } = await supabase
      .from('bot_requests')
      .select('*')
      .eq('bot_name', botRequest.name)
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
      const { data: updatedRequest, error: updateError } = await supabase
        .from('bot_requests')
        .update({
          attempts: existingRequest.attempts + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRequest.id)
        .select()
        .single();

      if (updateError) {
        console.error('Erro ao atualizar solicitação:', updateError);
        return NextResponse.json(
          { error: 'Erro ao atualizar solicitação existente' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        requestId: updatedRequest.id,
        status: updatedRequest.status,
        attempts: updatedRequest.attempts
      } as BotRequestResponse);
    }

    // Criar nova solicitação
    const { data: newRequest, error: insertError } = await supabase
      .from('bot_requests')
      .insert({
        bot_name: botRequest.name,
        bot_description: botRequest.description || '',
        bot_capabilities: botRequest.capabilities || [],
        contact_email: botRequest.contactEmail,
        website: botRequest.website || null,
        max_tokens_per_request: botRequest.maxTokensPerRequest || 1000,
        status: 'pending',
        attempts: 1
      })
      .select()
      .single();

    if (insertError || !newRequest) {
      console.error('Erro ao criar solicitação:', insertError);
      return NextResponse.json(
        { error: 'Erro ao criar solicitação de bot' },
        { status: 500 }
      );
    }

    console.log('✅ Solicitação criada:', newRequest);

    // Removendo a criação duplicada de notificações aqui, pois será gerenciada pelo BotRegisterNotification
    // A notificação será criada automaticamente através do listener de realtime

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

    const { data: botRequest, error: fetchError } = await supabase
      .from('bot_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar solicitação:', fetchError);
      return NextResponse.json(
        { error: 'Erro ao buscar solicitação' },
        { status: 500 }
      );
    }

    if (!botRequest) {
      return NextResponse.json(
        { error: 'Solicitação não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      requestId: botRequest.id,
      status: botRequest.status,
      message: botRequest.message,
      attempts: botRequest.attempts
    });
  } catch (error) {
    console.error('Erro ao buscar status da solicitação:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar status da solicitação' },
      { status: 500 }
    );
  }
} 