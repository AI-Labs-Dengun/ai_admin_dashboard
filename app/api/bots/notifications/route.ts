import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();

    // Validar dados necessários
    const { bot_id, bot_name, bot_description, notification_data } = body;

    if (!bot_id || !bot_name || !notification_data) {
      return NextResponse.json(
        { error: 'Dados inválidos: bot_id, bot_name e notification_data são obrigatórios' },
        { status: 400 }
      );
    }

    // Inserir notificação
    const { data, error } = await supabase
      .from('bot_notifications')
      .insert([
        {
          bot_id,
          bot_name,
          bot_description,
          notification_data,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar notificação:', error);
      return NextResponse.json(
        { error: 'Erro ao criar notificação' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar notificação' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verificar se é super_admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', session.user.id)
      .single();

    if (!profile?.is_super_admin) {
      return NextResponse.json(
        { error: 'Apenas super_admins podem acessar notificações' },
        { status: 403 }
      );
    }

    // Buscar notificações
    const { data, error } = await supabase
      .from('bot_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar notificações:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar notificações' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar notificações' },
      { status: 500 }
    );
  }
} 