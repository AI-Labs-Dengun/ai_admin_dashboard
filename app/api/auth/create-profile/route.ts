import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Criar cliente com service_role
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

export async function POST(request: Request) {
  try {
    const { userId, email, fullName, company } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    // Verificar se o usuário existe no auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (authError || !authUser) {
      console.error('Erro ao verificar usuário no auth:', authError);
      return NextResponse.json(
        { error: 'Usuário não encontrado no sistema de autenticação' },
        { status: 404 }
      );
    }

    // Verificar se o perfil já existe
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Erro ao verificar perfil existente:', checkError);
      return NextResponse.json(
        { error: 'Erro ao verificar perfil existente' },
        { status: 500 }
      );
    }

    // Se o perfil já existe, retornar sucesso
    if (existingProfile) {
      return NextResponse.json({ 
        success: true, 
        profile: existingProfile,
        message: 'Perfil já existe'
      });
    }

    // Aguardar um momento para garantir que o usuário foi criado completamente
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Criar perfil usando o service role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: userId,
          email: email,
          full_name: fullName,
          company: company,
          is_super_admin: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      return NextResponse.json(
        { error: 'Erro ao criar perfil' },
        { status: 500 }
      );
    }

    // Verificar se o perfil foi criado
    const { data: verifyProfile, error: verifyError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (verifyError || !verifyProfile) {
      console.error('Erro ao verificar perfil:', verifyError);
      return NextResponse.json(
        { error: 'Erro ao verificar perfil' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      profile: verifyProfile,
      message: 'Perfil criado com sucesso'
    });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno ao criar perfil' },
      { status: 500 }
    );
  }
} 