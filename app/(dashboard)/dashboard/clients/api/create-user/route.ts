import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Criar cliente com service_role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Verificar se o usuário atual é super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Obter os dados do novo usuário do corpo da requisição
    const { email, full_name, company, is_super_admin } = await request.json();

    // Verificar se o email já existe
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1,
      page: 1
    });

    const userExists = existingUser?.users?.some(user => user.email === email);
    if (userExists) {
      return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 400 });
    }

    // Criar o usuário usando o service_role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name,
        company,
        is_super_admin,
        needs_password_setup: true
      }
    });

    if (authError) {
      console.error('Erro ao criar usuário:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 400 });
    }

    // Atualizar o perfil criado automaticamente
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name,
        company,
        is_super_admin,
        updated_at: new Date().toISOString()
      })
      .eq('id', authData.user.id);

    if (updateError) {
      console.error('Erro ao atualizar perfil:', updateError);
      // Não retornamos erro aqui pois o usuário já foi criado
    }

    // Enviar magic link
    const { error: magicLinkError } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        data: {
          needs_password_setup: true,
          full_name,
          company,
          is_super_admin
        }
      }
    });

    if (magicLinkError) {
      console.error('Erro ao enviar magic link:', magicLinkError);
      // Tentar enviar novamente com um método alternativo
      const { error: retryError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        data: {
          needs_password_setup: true,
          full_name,
          company,
          is_super_admin
        }
      });

      if (retryError) {
        console.error('Erro ao enviar convite:', retryError);
        // Não retornamos erro aqui pois o usuário já foi criado
        // Apenas logamos o erro para debug
      }
    }

    return NextResponse.json({ 
      message: 'Usuário criado com sucesso',
      user: authData.user 
    });

  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 