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
    const { userId, email, fullName, company } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({ success: true, profile: verifyProfile });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno ao criar perfil' },
      { status: 500 }
    );
  }
} 