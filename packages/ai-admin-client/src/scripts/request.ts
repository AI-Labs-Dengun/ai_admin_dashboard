#!/usr/bin/env node

import axios from 'axios';
import fs from 'fs';
import path from 'path';

/**
 * Script para solicitar conexão entre aplicação externa e AI Admin Dashboard
 * Envia solicitação de registro de bot para o dashboard
 */

interface RequestOptions {
  name: string;
  email: string;
  website?: string;
  description?: string;
  capabilities?: string[];
  maxTokensPerRequest?: number;
  dashboardUrl?: string;
}

interface BotRequestResponse {
  requestId: string;
  status: 'pending' | 'approved' | 'rejected';
  attempts: number;
  message?: string;
}

function parseArguments(): RequestOptions {
  const args = process.argv.slice(2);
  const options: Partial<RequestOptions> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case '--name':
        options.name = value;
        break;
      case '--email':
        options.email = value;
        break;
      case '--website':
        options.website = value;
        break;
      case '--description':
        options.description = value;
        break;
      case '--capabilities':
        options.capabilities = value.split(',').map(c => c.trim());
        break;
      case '--max-tokens':
        options.maxTokensPerRequest = parseInt(value);
        break;
      case '--dashboard-url':
        options.dashboardUrl = value;
        break;
      case '--help':
        showHelp();
        process.exit(0);
    }
  }

  return options as RequestOptions;
}

function showHelp() {
  console.log(`
🚀 AI Admin Request - Solicitar Conexão com Dashboard

Uso:
  npx ai-admin-request [opções]

Opções obrigatórias:
  --name <nome>           Nome do seu bot
  --email <email>         Email de contato do administrador

Opções opcionais:
  --website <url>         Website/URL da sua aplicação
  --description <desc>    Descrição do bot
  --capabilities <list>   Capacidades separadas por vírgula (ex: chat,image,text)
  --max-tokens <number>   Limite máximo de tokens por requisição
  --dashboard-url <url>   URL do dashboard (padrão: http://localhost:3000)

Exemplos:
  # Solicitação básica
  npx ai-admin-request --name "Meu Bot" --email "admin@exemplo.com"

  # Solicitação completa
  npx ai-admin-request \\
    --name "ChatBot Avançado" \\
    --email "admin@empresa.com" \\
    --website "https://minhaaplicacao.com" \\
    --description "Bot de atendimento inteligente" \\
    --capabilities "chat,image,text,voice" \\
    --max-tokens 2000

  # Com dashboard customizado
  npx ai-admin-request \\
    --name "Meu Bot" \\
    --email "admin@exemplo.com" \\
    --dashboard-url "https://dashboard.empresa.com"
`);
}

function validateOptions(options: RequestOptions): string[] {
  const errors: string[] = [];

  if (!options.name) {
    errors.push('Nome do bot é obrigatório (--name)');
  }

  if (!options.email) {
    errors.push('Email de contato é obrigatório (--email)');
  }

  if (options.email && !isValidEmail(options.email)) {
    errors.push('Email inválido');
  }

  if (options.website && !isValidUrl(options.website)) {
    errors.push('URL do website inválida');
  }

  if (options.maxTokensPerRequest && options.maxTokensPerRequest < 1) {
    errors.push('Limite de tokens deve ser maior que 0');
  }

  return errors;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function loadConfigFromEnv(): Partial<RequestOptions> {
  const configPath = path.join(process.cwd(), 'ai-admin-config', '.env');
  const config: Partial<RequestOptions> = {};

  if (fs.existsSync(configPath)) {
    const envContent = fs.readFileSync(configPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      if (line.includes('DASHBOARD_URL=')) {
        config.dashboardUrl = line.split('=')[1]?.trim();
      }
    }
  }

  return config;
}

async function sendRequest(options: RequestOptions): Promise<BotRequestResponse> {
  const dashboardUrl = options.dashboardUrl || 'http://localhost:3000';
  
  console.log(`📡 Enviando solicitação para: ${dashboardUrl}`);
  console.log(`🤖 Nome do bot: ${options.name}`);
  console.log(`📧 Email: ${options.email}`);
  
  if (options.website) console.log(`🌐 Website: ${options.website}`);
  if (options.description) console.log(`📝 Descrição: ${options.description}`);
  if (options.capabilities) console.log(`⚡ Capacidades: ${options.capabilities.join(', ')}`);

  try {
    const response = await axios.post(`${dashboardUrl}/api/bots/request`, {
      name: options.name,
      description: options.description || `Bot ${options.name}`,
      capabilities: options.capabilities || ['chat'],
      contactEmail: options.email,
      website: options.website || 'http://localhost:3001',
      maxTokensPerRequest: options.maxTokensPerRequest || 1000
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(`Erro do dashboard (${error.response.status}): ${error.response.data?.error || error.message}`);
      } else if (error.request) {
        throw new Error(`Erro de conexão: Dashboard não acessível em ${dashboardUrl}`);
      }
    }
    throw new Error(`Erro inesperado: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function checkRequestStatus(requestId: string, dashboardUrl: string): Promise<BotRequestResponse | null> {
  try {
    const response = await axios.get(`${dashboardUrl}/api/bots/request`, {
      params: { requestId },
      timeout: 5000
    });

    return response.data;
  } catch (error) {
    console.warn('⚠️ Não foi possível verificar status da solicitação');
    return null;
  }
}

function saveRequestInfo(requestInfo: BotRequestResponse, options: RequestOptions) {
  const configDir = path.join(process.cwd(), 'ai-admin-config');
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const requestData = {
    requestId: requestInfo.requestId,
    status: requestInfo.status,
    attempts: requestInfo.attempts,
    botName: options.name,
    email: options.email,
    website: options.website,
    dashboardUrl: options.dashboardUrl || 'http://localhost:3000',
    timestamp: new Date().toISOString()
  };

  const requestPath = path.join(configDir, 'bot-request.json');
  fs.writeFileSync(requestPath, JSON.stringify(requestData, null, 2));

  console.log(`💾 Informações da solicitação salvas em: ai-admin-config/bot-request.json`);
}

function updateEnvWithBotInfo(options: RequestOptions) {
  const envPath = path.join(process.cwd(), 'ai-admin-config', '.env');
  
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf-8');
    
    // Atualizar DASHBOARD_URL se fornecido
    if (options.dashboardUrl) {
      envContent = envContent.replace(
        /DASHBOARD_URL=.*/,
        `DASHBOARD_URL=${options.dashboardUrl}`
      );
    }

    // Adicionar comentário com nome do bot para facilitar identificação
    if (!envContent.includes('# Bot registrado:')) {
      envContent = `# Bot registrado: ${options.name}
# Email: ${options.email}
# Status: Aguardando aprovação
${envContent}`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log('📝 Arquivo .env atualizado com informações do bot');
  }
}

async function main() {
  console.log('\n🚀 AI Admin Request - Solicitação de Conexão\n');

  try {
    // Parse dos argumentos
    const options = parseArguments();
    
    // Carregar configurações do ambiente se existir
    const envConfig = loadConfigFromEnv();
    const finalOptions = { ...envConfig, ...options };

    // Validar opções
    const errors = validateOptions(finalOptions);
    if (errors.length > 0) {
      console.error('❌ Erros de validação:');
      errors.forEach(error => console.error(`   - ${error}`));
      console.log('\nUse --help para ver as opções disponíveis');
      process.exit(1);
    }

    // Enviar solicitação
    console.log('📤 Enviando solicitação de registro...\n');
    const requestInfo = await sendRequest(finalOptions);

    console.log('\n✅ Solicitação enviada com sucesso!\n');
    console.log('📋 Detalhes da solicitação:');
    console.log(`   ID da solicitação: ${requestInfo.requestId}`);
    console.log(`   Status: ${requestInfo.status}`);
    console.log(`   Tentativas: ${requestInfo.attempts}`);
    
    if (requestInfo.message) {
      console.log(`   Mensagem: ${requestInfo.message}`);
    }

    // Salvar informações da solicitação
    saveRequestInfo(requestInfo, finalOptions);
    updateEnvWithBotInfo(finalOptions);

    // Verificar status se aprovado automaticamente
    if (requestInfo.status === 'approved') {
      console.log('\n🎉 Solicitação aprovada automaticamente!');
      console.log('✅ Seu bot está pronto para uso');
    } else if (requestInfo.status === 'pending') {
      console.log('\n⏳ Solicitação pendente de aprovação');
      console.log('📧 O administrador do dashboard será notificado');
      console.log('🔄 Você pode verificar o status com:');
      console.log(`   npx ai-admin-status --request-id ${requestInfo.requestId}`);
    } else if (requestInfo.status === 'rejected') {
      console.log('\n❌ Solicitação rejeitada');
      if (requestInfo.attempts >= 5) {
        console.log('⚠️ Número máximo de tentativas excedido');
      }
    }

    console.log('\n📚 Próximos passos:');
    console.log('1. Aguarde a aprovação do administrador (se pendente)');
    console.log('2. Configure BOT_ID e BOT_SECRET no arquivo .env');
    console.log('3. Execute sua aplicação com: npm start');

  } catch (error) {
    console.error('\n❌ Erro ao enviar solicitação:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    console.log('\n🔧 Possíveis soluções:');
    console.log('   - Verifique se o dashboard está rodando');
    console.log('   - Confirme a URL do dashboard (--dashboard-url)');
    console.log('   - Verifique sua conexão de internet');
    process.exit(1);
  }
}

main(); 