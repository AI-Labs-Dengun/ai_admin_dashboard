import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId, adminId } = await request.json();

    if (!userId || !adminId) {
      return NextResponse.json(
        { error: 'ID do usuário e do admin são obrigatórios' },
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

    // Verificar se o admin é super_admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', adminId)
      .single();

    if (profileError) throw profileError;
    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Apenas super admins podem deletar usuários' }, { status: 403 });
    }

    // 1. Remover uso de tokens
    const { error: tokenUsageError } = await supabaseAdmin
      .from('client_bot_usage')
      .delete()
      .eq('user_id', userId);

    if (tokenUsageError) throw tokenUsageError;

    // 2. Remover associações com tenants
    const { error: tenantUsersError } = await supabaseAdmin
      .from('super_tenant_users')
      .delete()
      .eq('user_id', userId);

    if (tenantUsersError) throw tenantUsersError;

    // 3. Remover o perfil
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) throw profileDeleteError;

    // 4. Remover o usuário da autenticação
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