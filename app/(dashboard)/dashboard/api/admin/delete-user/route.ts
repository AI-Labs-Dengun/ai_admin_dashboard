import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      );
    }

    // Criar cliente admin com service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Remover todas as associações com bots
    const { error: userBotsError } = await supabaseAdmin
      .from('client_user_bots')
      .delete()
      .eq('user_id', userId);

    if (userBotsError) throw userBotsError;

    // 2. Remover uso de tokens
    const { error: tokenUsageError } = await supabaseAdmin
      .from('client_bot_usage')
      .delete()
      .eq('user_id', userId);

    if (tokenUsageError) throw tokenUsageError;

    // 3. Remover associações com tenants
    const { error: tenantUsersError } = await supabaseAdmin
      .from('super_tenant_users')
      .delete()
      .eq('user_id', userId);

    if (tenantUsersError) throw tenantUsersError;

    // 4. Remover o perfil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) throw profileError;

    // 5. Remover o usuário da autenticação
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) throw authError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar usuário' },
      { status: 500 }
    );
  }
} 