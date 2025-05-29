import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';

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

    // Atualizar a notificação existente
    const { error: notificationError } = await supabase
      .from('bot_notifications')
      .update({
        status,
        notification_data: {
          ...updatedRequest,
          type: 'bot_request',
          status
        }
      })
      .eq('bot_id', requestId)
      .eq('status', 'pending');

    if (notificationError) {
      console.error('Erro ao atualizar notificação:', notificationError);
      // Não retornamos erro aqui pois a solicitação já foi atualizada
    }

    // Se aprovado, criar o bot e suas associações
    if (status === 'approved') {
      // Criar o bot
      const { data: bot, error: botError } = await supabase
        .from('bots')
        .insert([
          {
            name: updatedRequest.bot_name,
            description: updatedRequest.bot_description,
            bot_capabilities: updatedRequest.bot_capabilities,
            contact_email: updatedRequest.contact_email,
            website: updatedRequest.website,
            max_tokens_per_request: updatedRequest.max_tokens_per_request
          }
        ])
        .select()
        .single();

      if (botError) {
        console.error('Erro ao criar bot:', botError);
        return NextResponse.json(
          { error: 'Erro ao criar bot' },
          { status: 500 }
        );
      }

      // Buscar todos os tenants ativos
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id');

      if (tenantsError) {
        console.error('Erro ao buscar tenants:', tenantsError);
        return NextResponse.json(
          { error: 'Erro ao buscar tenants' },
          { status: 500 }
        );
      }

      // Criar associações com todos os tenants ativos
      if (tenants && tenants.length > 0) {
        const tenantBotInserts = tenants.map(tenant => ({
          tenant_id: tenant.id,
          bot_id: bot.id,
          enabled: true,
          created_at: new Date().toISOString()
        }));

        const { error: tenantBotError } = await supabase
          .from('tenant_bots')
          .insert(tenantBotInserts);

        if (tenantBotError) {
          console.error('Erro ao associar bot aos tenants:', tenantBotError);
          return NextResponse.json(
            { error: 'Bot criado, mas houve erro ao associar aos tenants' },
            { status: 500 }
          );
        }
      }

      // Gerar token JWT para o bot
      try {
        const token = await generateBotToken(bot.id, undefined);
        return NextResponse.json({ 
          requestId: updatedRequest.id,
          status: updatedRequest.status,
          message: updatedRequest.message,
          bot,
          token
        });
      } catch (tokenError) {
        console.error('Erro ao gerar token:', tokenError);
        return NextResponse.json({ 
          requestId: updatedRequest.id,
          status: updatedRequest.status,
          message: updatedRequest.message,
          bot,
          error: 'Bot criado, mas houve erro ao gerar token. Tente gerar um novo token mais tarde.'
        });
      }
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