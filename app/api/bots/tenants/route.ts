import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // Obter o token do header Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyBotToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Buscar tenants associados ao bot
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenant_bots')
      .select(`
        tenant_id,
        enabled,
        tenants (
          id,
          name,
          created_at,
          token_limit,
          max_requests_per_day
        )
      `)
      .eq('bot_id', payload.userId)
      .eq('enabled', true);

    if (tenantsError) {
      console.error('Erro ao buscar tenants:', tenantsError);
      return NextResponse.json(
        { error: 'Erro ao buscar tenants' },
        { status: 500 }
      );
    }

    // Formatar resposta
    const formattedTenants = tenants.map(t => ({
      id: t.tenant_id,
      name: t.tenants.name,
      tokenLimit: t.tenants.token_limit || 1000,
      maxRequestsPerDay: t.tenants.max_requests_per_day || 100,
      createdAt: t.tenants.created_at
    }));

    return NextResponse.json(formattedTenants);
  } catch (error) {
    console.error('Erro ao listar tenants:', error);
    return NextResponse.json(
      { error: 'Erro ao listar tenants' },
      { status: 500 }
    );
  }
} 