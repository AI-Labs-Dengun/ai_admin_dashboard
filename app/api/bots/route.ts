import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateBotToken } from '@/app/(dashboard)/dashboard/lib/jwtManagement';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, capabilities, contactEmail, website, maxTokensPerRequest } = body;

    // Validar campos obrigatórios
    if (!name || !description || !capabilities || !contactEmail) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não fornecidos' },
        { status: 400 }
      );
    }

    // Verificar se já existe um bot com o mesmo nome
    const { data: existingBot } = await supabase
      .from('bots')
      .select('id')
      .eq('name', name)
      .single();

    if (existingBot) {
      return NextResponse.json(
        { error: 'Já existe um bot com este nome' },
        { status: 400 }
      );
    }

    // Criar o bot
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .insert([
        {
          name,
          description,
          bot_capabilities: capabilities,
          contact_email: contactEmail,
          website,
          max_tokens_per_request: maxTokensPerRequest || 1000
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

    // Gerar token JWT para o bot
    try {
      const token = await generateBotToken(bot.id, undefined);
      return NextResponse.json({ bot, token });
    } catch (tokenError) {
      console.error('Erro ao gerar token:', tokenError);
      // Mesmo com erro no token, retornamos o bot criado
      return NextResponse.json({ 
        bot,
        error: 'Bot criado, mas houve erro ao gerar token. Tente gerar um novo token mais tarde.'
      });
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: tokenData, error: tokenError } = await supabase
      .from('jwt_token_data')
      .select('*')
      .single();

    if (tokenError) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Buscar bots associados ao tenant
    const { data: bots, error: botsError } = await supabase
      .from('tenant_bots')
      .select(`
        bot_id,
        enabled,
        bots (
          id,
          name,
          description,
          bot_capabilities,
          contact_email,
          website,
          max_tokens_per_request,
          created_at
        )
      `)
      .eq('tenant_id', tokenData.tenant_id)
      .eq('enabled', true);

    if (botsError) {
      return NextResponse.json(
        { error: 'Erro ao buscar bots' },
        { status: 500 }
      );
    }

    return NextResponse.json(bots);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
} 