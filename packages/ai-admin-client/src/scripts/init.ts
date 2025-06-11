#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import axios from 'axios';

/**
 * Script de inicialização completa - Setup automatizado para integração com AI Admin Dashboard
 * Workflow: instala -> inicializa com parâmetros -> solicita conexão automaticamente
 */

const CONFIG_DIR = 'ai-admin-config';

interface InitOptions {
  botName: string;
  email: string;
  capabilities: string[];
  botUrl: string;
  dashboardUrl?: string;
}

interface BotRequestResponse {
  requestId: string;
  status: 'pending' | 'approved' | 'rejected';
  botId?: string;
  botSecret?: string;
  message?: string;
}

// Detectar se é projeto Next.js
function isNextJsProject(): boolean {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return !!(packageJson.dependencies?.next || packageJson.devDependencies?.next);
  }
  return false;
}

// Detectar se é projeto Express
function isExpressProject(): boolean {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return !!(packageJson.dependencies?.express || packageJson.devDependencies?.express);
  }
  return false;
}

function parseArguments(): InitOptions {
  const args = process.argv.slice(2);
  const options: Partial<InitOptions> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case '--name':
        options.botName = value;
        break;
      case '--email':
        options.email = value;
        break;
      case '--capabilities':
        options.capabilities = value.split(',').map(c => c.trim());
        break;
      case '--url':
        options.botUrl = value;
        break;
      case '--dashboard-url':
        options.dashboardUrl = value;
        break;
      case '--help':
        showHelp();
        process.exit(0);
    }
  }

  return options as InitOptions;
}

function showHelp() {
  console.log(`
🚀 AI Admin Init - Inicialização Automatizada

Uso:
  npx ai-admin-init [opções]

Opções obrigatórias:
  --name <nome>           Nome do seu bot
  --email <email>         Email da sua conta
  --capabilities <list>   Competências separadas por vírgula (ex: chat,image,text)
  --url <url>            URL do seu bot/aplicação

Opções opcionais:
  --dashboard-url <url>   URL do dashboard (padrão: http://localhost:3000)

Exemplos:
  # Inicialização básica
  npx ai-admin-init \\
    --name "Meu ChatBot" \\
    --email "admin@empresa.com" \\
    --capabilities "chat,text" \\
    --url "http://localhost:3001"

  # Com dashboard customizado
  npx ai-admin-init \\
    --name "Bot Avançado" \\
    --email "admin@empresa.com" \\
    --capabilities "chat,image,text,voice" \\
    --url "https://meubot.com" \\
    --dashboard-url "https://dashboard.empresa.com"

Capabilities disponíveis:
  - chat: Conversação via chat
  - text: Processamento de texto
  - image: Geração/análise de imagens
  - voice: Processamento de voz
  - code: Geração de código
  - search: Busca e pesquisa
`);
}

function validateOptions(options: InitOptions): string[] {
  const errors: string[] = [];

  if (!options.botName) {
    errors.push('Nome do bot é obrigatório (--name)');
  }

  if (!options.email) {
    errors.push('Email é obrigatório (--email)');
  }

  if (options.email && !isValidEmail(options.email)) {
    errors.push('Email inválido');
  }

  if (!options.capabilities || options.capabilities.length === 0) {
    errors.push('Competências são obrigatórias (--capabilities)');
  }

  if (!options.botUrl) {
    errors.push('URL do bot é obrigatória (--url)');
  }

  if (options.botUrl && !isValidUrl(options.botUrl)) {
    errors.push('URL do bot inválida');
  }

  const validCapabilities = ['chat', 'text', 'image', 'voice', 'code', 'search'];
  const invalidCapabilities = options.capabilities?.filter(cap => !validCapabilities.includes(cap));
  if (invalidCapabilities && invalidCapabilities.length > 0) {
    errors.push(`Competências inválidas: ${invalidCapabilities.join(', ')}`);
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

async function sendConnectionRequest(options: InitOptions): Promise<BotRequestResponse> {
  const dashboardUrl = options.dashboardUrl || 'http://localhost:3000';
  
  console.log(`📡 Enviando solicitação de conexão para: ${dashboardUrl}`);
  
  try {
    const response = await axios.post(`${dashboardUrl}/api/bots/request`, {
      name: options.botName,
      description: `Bot ${options.botName} - ${options.capabilities.join(', ')}`,
      capabilities: options.capabilities,
      contactEmail: options.email,
      website: options.botUrl,
      maxTokensPerRequest: 2000,
      metadata: {
        source: 'ai-admin-client',
        clientVersion: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        autoSetup: true
      }
    }, {
      timeout: 15000,
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
        throw new Error(`Dashboard não acessível em ${dashboardUrl}. Verifique se está rodando.`);
      }
    }
    throw new Error(`Erro inesperado: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function createEnvFile(options: InitOptions, connectionResult?: BotRequestResponse) {
  const envContent = `# ========================================
# AI ADMIN DASHBOARD - CONFIGURAÇÃO AUTOMÁTICA
# ========================================
# GERADO AUTOMATICAMENTE - NÃO EDITAR MANUALMENTE
# Para reconfigurar, execute: npx ai-admin-init novamente

# 🤖 INFORMAÇÕES DO BOT
BOT_NAME=${options.botName}
BOT_DESCRIPTION=Bot ${options.botName} - ${options.capabilities.join(', ')}
BOT_VERSION=1.0.0
BOT_AUTHOR=Criado via ai-admin-init
BOT_WEBSITE=${options.botUrl}
BOT_CAPABILITIES=${options.capabilities.join(',')}

# 🔗 CONEXÃO COM DASHBOARD
DASHBOARD_URL=${options.dashboardUrl || 'http://localhost:3000'}
${connectionResult?.botId ? `BOT_ID=${connectionResult.botId}` : '# BOT_ID=aguardando-aprovacao'}
${connectionResult?.botSecret ? `BOT_SECRET=${connectionResult.botSecret}` : '# BOT_SECRET=aguardando-aprovacao'}

# 📊 STATUS DA CONEXÃO
CONNECTION_STATUS=${connectionResult?.status || 'pending'}
${connectionResult?.requestId ? `REQUEST_ID=${connectionResult.requestId}` : ''}
SETUP_DATE=${new Date().toISOString()}

# ⚙️ CONFIGURAÇÕES AUTOMÁTICAS
AUTO_REPORT_USAGE=true
AUTO_REPORT_ERRORS=true
REPORT_INTERVAL=30000
DEBUG=false

# 🔐 CONFIGURAÇÕES DE SEGURANÇA
API_TIMEOUT=10000
MAX_RETRIES=3

# 📊 CONFIGURAÇÕES DE TELEMETRIA
TELEMETRY_ENABLED=true
ERROR_REPORTING=true
ANALYTICS_ENABLED=true

# 🌐 CONFIGURAÇÕES DA APLICAÇÃO
NODE_ENV=development
PORT=3001
`;

  const envPath = path.join(process.cwd(), CONFIG_DIR, '.env');
  const envExamplePath = path.join(process.cwd(), CONFIG_DIR, '.env.example');
  
  // Criar .env
  fs.writeFileSync(envPath, envContent);
  
  // Criar .env.example (sem dados sensíveis)
  const exampleContent = envContent
    .replace(/BOT_ID=.*/g, 'BOT_ID=seu-bot-id-aqui')
    .replace(/BOT_SECRET=.*/g, 'BOT_SECRET=seu-bot-secret-aqui')
    .replace(/REQUEST_ID=.*/g, 'REQUEST_ID=id-da-solicitacao');
  
  fs.writeFileSync(envExamplePath, exampleContent);
  
  console.log('✅ Arquivos de configuração criados:');
  console.log('   - ai-admin-config/.env (configuração completa)');
  console.log('   - ai-admin-config/.env.example (template público)');
}

function createGitignore() {
  const gitignorePath = path.join(process.cwd(), CONFIG_DIR, '.gitignore');
  const gitignoreContent = `# AI Admin Client - Arquivos sensíveis
# NUNCA commitar estes arquivos!

.env
bot-request.json
*.log
*.secret

# Manter apenas
!.env.example
!README.md
!package.json
`;

  fs.writeFileSync(gitignorePath, gitignoreContent);
  console.log('✅ .gitignore criado para proteger arquivos sensíveis');
}

function createClientSetup() {
  const clientContent = `import { AiAdminClient } from 'dengun_ai-admin-client';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Verificar se o bot foi aprovado
if (!process.env.BOT_ID || !process.env.BOT_SECRET) {
  if (process.env.CONNECTION_STATUS === 'pending') {
    console.log('⏳ Bot ainda não foi aprovado. Aguarde a aprovação do administrador.');
    console.log(\`📧 Solicitação enviada para: \${process.env.DASHBOARD_URL}\`);
    console.log(\`🆔 ID da solicitação: \${process.env.REQUEST_ID}\`);
  } else {
    console.log('❌ Configuração incompleta. Execute: npx ai-admin-init');
  }
}

// Configuração do cliente AI Admin
export const aiAdminClient = new AiAdminClient({
  dashboardUrl: process.env.DASHBOARD_URL!,
  botId: process.env.BOT_ID!,
  botSecret: process.env.BOT_SECRET!,
  options: {
    autoReportUsage: process.env.AUTO_REPORT_USAGE === 'true',
    autoReportErrors: process.env.AUTO_REPORT_ERRORS === 'true',
    reportInterval: parseInt(process.env.REPORT_INTERVAL || '30000'),
    timeout: parseInt(process.env.API_TIMEOUT || '10000'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    debug: process.env.DEBUG === 'true'
  }
});

// Singleton para garantir uma única instância
let isInitialized = false;

export async function initializeAiAdmin(): Promise<AiAdminClient> {
  if (!process.env.BOT_ID || !process.env.BOT_SECRET) {
    throw new Error('Bot não aprovado ainda. Verifique o status no dashboard.');
  }

  if (!isInitialized) {
    try {
      await aiAdminClient.initialize();
      isInitialized = true;
      console.log(\`🚀 \${process.env.BOT_NAME} conectado ao AI Admin Dashboard\`);
    } catch (error) {
      console.error('❌ Erro ao conectar ao dashboard:', error);
      throw error;
    }
  }
  return aiAdminClient;
}

// Função helper para verificar se está pronto para uso
export function isReadyForUse(): boolean {
  return !!(process.env.BOT_ID && process.env.BOT_SECRET && process.env.CONNECTION_STATUS === 'approved');
}

// Função para usar em handlers
export async function withAiAdmin<T>(
  handler: (client: AiAdminClient) => Promise<T>
): Promise<T> {
  if (!isReadyForUse()) {
    throw new Error('Bot ainda não foi aprovado. Aguarde a aprovação do administrador.');
  }
  
  const client = await initializeAiAdmin();
  return handler(client);
}

// Eventos de monitoramento
if (isReadyForUse()) {
  aiAdminClient.on('connected', () => {
    console.log(\`🔗 \${process.env.BOT_NAME} conectado ao dashboard\`);
  });

  aiAdminClient.on('disconnected', () => {
    console.log(\`🔌 \${process.env.BOT_NAME} desconectado do dashboard\`);
  });

  aiAdminClient.on('sessionCreated', (session) => {
    console.log('👤 Nova sessão criada:', session.sessionId);
  });

  aiAdminClient.on('usageReported', (usage) => {
    console.log('📊 Uso reportado:', usage.tokensUsed, 'tokens');
  });

  aiAdminClient.on('errorReported', (error) => {
    console.log('🐛 Erro reportado:', error.error);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log(\`🔴 Encerrando \${process.env.BOT_NAME}...\`);
    await aiAdminClient.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log(\`🔴 Encerrando \${process.env.BOT_NAME}...\`);
    await aiAdminClient.shutdown();
    process.exit(0);
  });
}
`;

  const clientPath = path.join(process.cwd(), CONFIG_DIR, 'client.ts');
  fs.writeFileSync(clientPath, clientContent);
  console.log('✅ Cliente configurado: ai-admin-config/client.ts');
}







function createPackageJson() {
  const projectType = isNextJsProject() ? 'nextjs' : isExpressProject() ? 'express' : 'standalone';
  
  const packageContent = {
    "name": "ai-admin-integration",
    "version": "1.0.0",
    "description": `Integração automatizada com AI Admin Dashboard - ${projectType}`,
    "main": projectType === 'express' ? 'express-server.ts' : 'exemplo.ts',
    "scripts": {
      "start": projectType === 'express' ? "ts-node express-server.ts" : "ts-node exemplo.ts",
      "dev": projectType === 'express' ? "ts-node-dev --respawn express-server.ts" : "ts-node-dev --respawn exemplo.ts",
      "test": "ts-node exemplo.ts",
      "build": "tsc",
      "check-status": "node -e \"console.log('Status:', require('./.env').CONNECTION_STATUS || 'Não configurado')\""
    },
    "dependencies": {
      "dengun_ai-admin-client": "^2.0.0",
      "dotenv": "^16.5.0",
      ...(projectType === 'express' ? { "express": "^4.18.2", "@types/express": "^4.17.17" } : {}),
      ...(projectType === 'nextjs' ? {} : {})
    },
    "devDependencies": {
      "@types/node": "^20.0.0",
      "ts-node": "^10.9.1",
      "ts-node-dev": "^2.0.0",
      "typescript": "^5.0.0"
    }
  };

  const packagePath = path.join(process.cwd(), CONFIG_DIR, 'package.json');
  fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2));
  console.log(`✅ Package.json criado para ${projectType}: ai-admin-config/package.json`);
}

function createReadme(options: InitOptions, connectionResult?: BotRequestResponse) {
  const projectType = isNextJsProject() ? 'Next.js' : isExpressProject() ? 'Express' : 'Standalone';
  
  const readmeContent = `# ${options.botName} - Integração AI Admin Dashboard

## 🤖 Bot Configurado Automaticamente

- **Nome**: ${options.botName}
- **Competências**: ${options.capabilities.join(', ')}
- **URL**: ${options.botUrl}
- **Status**: ${connectionResult?.status || 'Configurando...'}
- **Tipo de Projeto**: ${projectType}

## 📊 Status da Conexão

${connectionResult?.status === 'approved' ? '✅ **APROVADO** - Seu bot está pronto para uso!' : ''}
${connectionResult?.status === 'pending' ? '⏳ **PENDENTE** - Aguardando aprovação do administrador' : ''}
${connectionResult?.status === 'rejected' ? '❌ **REJEITADO** - Entre em contato com o administrador' : ''}

${connectionResult?.requestId ? `**ID da Solicitação**: \`${connectionResult.requestId}\`` : ''}

## 🚀 Como Usar

### 1. Instalar Dependências
\`\`\`bash
cd ai-admin-config
npm install
\`\`\`

### 2. Verificar Status
\`\`\`bash
npm run check-status
\`\`\`

### 3. Executar
${connectionResult?.status === 'approved' ? `
\`\`\`bash
# Testar integração
npm run test

# Executar aplicação
npm start

# Modo desenvolvimento
npm run dev
\`\`\`
` : `
⚠️ **Aguarde a aprovação antes de executar**

O administrador do dashboard precisa aprovar seu bot primeiro.
Você receberá notificação por email quando aprovado.
`}

## 🔐 Segurança

- ✅ Arquivo \`.env\` está protegido pelo \`.gitignore\`
- ✅ Credenciais nunca são expostas no código
- ✅ Comunicação segura com o dashboard
- ✅ Apenas \`.env.example\` deve ser commitado

## 📁 Arquivos Criados

- \`client.ts\` - Cliente configurado do AI Admin
- \`.env\` - Configurações (NUNCA commitar!)
- \`.env.example\` - Template público
- \`.gitignore\` - Proteção de arquivos sensíveis
- \`package.json\` - Dependências do projeto

## 🆘 Solução de Problemas

### Bot Pendente de Aprovação
\`\`\`bash
# Verificar status
npm run check-status

# Reenviar solicitação (se necessário)
npx ai-admin-init --name "${options.botName}" --email "${options.email}" --capabilities "${options.capabilities.join(',')}" --url "${options.botUrl}"
\`\`\`

### Erro de Conexão
1. Verifique se o dashboard está rodando
2. Confirme a URL do dashboard no \`.env\`
3. Aguarde a aprovação se ainda estiver pendente

### Reconfigurar Bot
\`\`\`bash
# Executar novamente com novos parâmetros
npx ai-admin-init --name "Novo Nome" --email "novo@email.com" --capabilities "chat,text" --url "http://nova-url.com"
\`\`\`

---

**🔒 Lembre-se**: NUNCA commite o arquivo \`.env\` - ele contém credenciais sensíveis!
`;

  const readmePath = path.join(process.cwd(), CONFIG_DIR, 'README.md');
  fs.writeFileSync(readmePath, readmeContent);
  console.log('✅ Documentação criada: ai-admin-config/README.md');
}

function saveConnectionInfo(options: InitOptions, connectionResult: BotRequestResponse) {
  const connectionData = {
    botName: options.botName,
    email: options.email,
    capabilities: options.capabilities,
    botUrl: options.botUrl,
    dashboardUrl: options.dashboardUrl || 'http://localhost:3000',
    requestId: connectionResult.requestId,
    status: connectionResult.status,
    botId: connectionResult.botId,
    timestamp: new Date().toISOString(),
    message: connectionResult.message
  };

  const connectionPath = path.join(process.cwd(), CONFIG_DIR, 'bot-request.json');
  fs.writeFileSync(connectionPath, JSON.stringify(connectionData, null, 2));
  console.log('💾 Informações da conexão salvas em: ai-admin-config/bot-request.json');
}

async function main() {
  console.log('\n🚀 AI Admin Init - Configuração Automatizada v2.0\n');

  try {
    // Parse dos argumentos
    const options = parseArguments();
    
    // Validar opções
    const errors = validateOptions(options);
    if (errors.length > 0) {
      console.error('❌ Parâmetros inválidos:');
      errors.forEach(error => console.error(`   - ${error}`));
      console.log('\nUse --help para ver as opções disponíveis');
      process.exit(1);
    }

    console.log('📋 Configuração do Bot:');
    console.log(`   Nome: ${options.botName}`);
    console.log(`   Email: ${options.email}`);
    console.log(`   Competências: ${options.capabilities.join(', ')}`);
    console.log(`   URL: ${options.botUrl}`);
    console.log(`   Dashboard: ${options.dashboardUrl || 'http://localhost:3000'}`);

    // Criar diretório de configuração
    const configDir = path.join(process.cwd(), CONFIG_DIR);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      console.log('\n📁 Diretório de configuração criado: ai-admin-config/');
    }

    // Enviar solicitação de conexão
    console.log('\n📤 Enviando solicitação de conexão...');
    const connectionResult = await sendConnectionRequest(options);

    console.log('\n✅ Solicitação enviada com sucesso!');
    console.log(`   Status: ${connectionResult.status}`);
    console.log(`   ID: ${connectionResult.requestId}`);
    if (connectionResult.message) {
      console.log(`   Mensagem: ${connectionResult.message}`);
    }

    // Criar arquivos de configuração
    console.log('\n🔧 Criando configurações...');
    createEnvFile(options, connectionResult);
    createGitignore();
    createClientSetup();
    createPackageJson();
    createReadme(options, connectionResult);
    saveConnectionInfo(options, connectionResult);

    // Resultado final
    console.log('\n🎉 Configuração completa!');
    
    if (connectionResult.status === 'approved') {
      console.log('\n✅ Bot aprovado automaticamente!');
      console.log('🚀 Seu bot está pronto para uso');
      console.log('\n📋 Próximos passos:');
      console.log('1. cd ai-admin-config');
      console.log('2. npm install');
      console.log('3. npm start');
    } else if (connectionResult.status === 'pending') {
      console.log('\n⏳ Bot pendente de aprovação');
      console.log('📧 O administrador foi notificado');
      console.log('🔔 Você receberá email quando aprovado');
      console.log('\n📋 Próximos passos:');
      console.log('1. cd ai-admin-config');
      console.log('2. npm install');
      console.log('3. Aguarde aprovação');
      console.log('4. npm start (após aprovação)');
    } else {
      console.log('\n❌ Solicitação rejeitada');
      console.log('📧 Entre em contato com o administrador');
    }

    console.log('\n💡 Todos os arquivos sensíveis estão protegidos pelo .gitignore');
    console.log('🔒 NUNCA commite o arquivo .env - ele contém credenciais!');

  } catch (error) {
    console.error('\n❌ Erro durante a configuração:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    console.log('\n🔧 Possíveis soluções:');
    console.log('   - Verifique se o dashboard está rodando');
    console.log('   - Confirme a URL do dashboard');
    console.log('   - Verifique sua conexão de internet');
    console.log('   - Execute novamente com --help para ver opções');
    process.exit(1);
  }
}

main();
