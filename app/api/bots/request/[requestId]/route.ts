import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  try {
    const { status, message } = await request.json();
    const { requestId } = params;

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      );
    }

    // Atualizar status da solicitação
    const { data: updatedRequest } = await supabase
      .from('bot_requests')
      .update({
        status,
        message,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (!updatedRequest) {
      return NextResponse.json(
        { error: 'Solicitação não encontrada' },
        { status: 404 }
      );
    }

    // Se aprovado, criar registro de registro do bot
    if (status === 'approved') {
      const { data: botRegistration } = await supabase
        .from('bot_registrations')
        .insert({
          bot_id: requestId,
          tenant_id: updatedRequest.tenant_id,
          status: 'active',
          token_limit: updatedRequest.max_tokens_per_request || 1000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      return NextResponse.json({
        requestId: updatedRequest.id,
        status: updatedRequest.status,
        message: updatedRequest.message,
        registration: botRegistration
      });
    }

    return NextResponse.json({
      requestId: updatedRequest.id,
      status: updatedRequest.status,
      message: updatedRequest.message
    });
  } catch (error) {
    console.error('Erro ao atualizar status da solicitação:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar status da solicitação' },
      { status: 500 }
    );
  }
} 