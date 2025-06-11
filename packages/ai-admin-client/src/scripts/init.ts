#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Script de inicialização completa - Setup para integração com AI Admin Dashboard
 * Cria toda a estrutura necessária para conectar app externa ao dashboard
 */

const CONFIG_DIR = 'ai-admin-config';

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

function createEnvFile() {
  const envContent = `# ========================================
# AI ADMIN DASHBOARD - CONFIGURAÇÃO
# ========================================

# 🔗 CONEXÃO COM DASHBOARD (Obrigatório)
DASHBOARD_URL=http://localhost:3000
BOT_ID=seu-bot-id
BOT_SECRET=seu-bot-secret

# ⚙️ CONFIGURAÇÕES AUTOMÁTICAS (Opcional)
AUTO_REPORT_USAGE=true
AUTO_REPORT_ERRORS=true
REPORT_INTERVAL=30000
DEBUG=false

# 🔐 CONFIGURAÇÕES DE SEGURANÇA
JWT_SECRET=your-jwt-secret-here
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
  
  fs.writeFileSync(envPath, envContent);
  fs.writeFileSync(envExamplePath, envContent);
  
  console.log('✅ Arquivos de ambiente criados:');
  console.log('   - ai-admin-config/.env');
  console.log('   - ai-admin-config/.env.example');
}

function createClientSetup() {
  const clientContent = `import { AiAdminClient } from 'dengun_ai-admin-client';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

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
  if (!isInitialized) {
    try {
      await aiAdminClient.initialize();
      isInitialized = true;
      console.log('🚀 AI Admin Client inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar AI Admin Client:', error);
      throw error;
    }
  }
  return aiAdminClient;
}

// Função para usar em handlers
export async function withAiAdmin<T>(
  handler: (client: AiAdminClient) => Promise<T>
): Promise<T> {
  const client = await initializeAiAdmin();
  return handler(client);
}

// Eventos de monitoramento
aiAdminClient.on('connected', () => {
  console.log('🔗 Conectado ao AI Admin Dashboard');
});

aiAdminClient.on('disconnected', () => {
  console.log('🔌 Desconectado do AI Admin Dashboard');
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
  console.log('🔴 Encerrando AI Admin Client...');
  await aiAdminClient.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔴 Encerrando AI Admin Client...');
  await aiAdminClient.shutdown();
  process.exit(0);
});
`;

  const clientPath = path.join(process.cwd(), CONFIG_DIR, 'client.ts');
  fs.writeFileSync(clientPath, clientContent);
  console.log('✅ Cliente configurado: ai-admin-config/client.ts');
}

function createExpressIntegration() {
  const expressContent = `import express from 'express';
import { aiAdminClient, initializeAiAdmin, withAiAdmin } from './client';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Middleware de CORS para dashboard
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.DASHBOARD_URL);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Endpoint de status para o dashboard
app.get('/api/ai-admin/status', async (req, res) => {
  try {
    const status = await aiAdminClient.getConnectionStatus();
    const stats = await aiAdminClient.getUsageStats();
    const sessions = aiAdminClient.getActiveSessions();
    
    res.json({
      connected: status.connected,
      activeSessions: sessions.length,
      tokensUsed: stats.local?.totalTokens || 0,
      totalUsage: stats.local?.totalUsage || 0,
      lastPing: status.lastPing
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter status' });
  }
});

// Endpoint de chat - Exemplo de integração
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId, tenantId } = req.body;

    if (!message || !userId || !tenantId) {
      return res.status(400).json({ 
        error: 'message, userId e tenantId são obrigatórios' 
      });
    }

    await withAiAdmin(async (client) => {
      // 1. Criar sessão para o usuário
      const session = await client.createUserSession(userId, tenantId, {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });

      try {
        // 2. Processar mensagem (SUBSTITUA PELA SUA LÓGICA)
        const response = await processMessage(message);

        // 3. Reportar uso automaticamente
        await client.reportUsage({
          sessionId: session.sessionId,
          userId,
          tenantId,
          action: 'chat_message',
          tokensUsed: response.tokensUsed,
          metadata: {
            messageLength: message.length,
            responseTime: response.responseTime
          }
        });

        res.json({
          response: response.content,
          sessionId: session.sessionId,
          tokensUsed: response.tokensUsed
        });

      } finally {
        // 4. Encerrar sessão
        await client.endUserSession(session.sessionId);
      }
    });

  } catch (error) {
    console.error('Erro no chat:', error);
    
    // Reportar erro automaticamente
    try {
      await aiAdminClient.reportError({
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'CHAT_ERROR',
        context: { endpoint: '/api/chat', body: req.body }
      });
    } catch (reportError) {
      console.error('Erro ao reportar erro:', reportError);
    }

    res.status(500).json({ error: 'Erro interno' });
  }
});

// Webhook para receber comandos do dashboard
app.post('/api/ai-admin/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    switch (type) {
      case 'ping':
        res.json({ status: 'ok', timestamp: Date.now() });
        break;
        
      case 'status_check':
        const status = await aiAdminClient.getConnectionStatus();
        res.json(status);
        break;
        
      default:
        res.status(400).json({ error: 'Tipo de comando não suportado' });
    }
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Função de exemplo para processar mensagens
async function processMessage(message: string) {
  // SUBSTITUA ESTA FUNÇÃO PELA SUA LÓGICA DE IA/CHATBOT
  const responseTime = Date.now();
  
  // Simular processamento
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    content: \`Resposta para: \${message}\`,
    tokensUsed: Math.floor(message.length * 0.75), // Exemplo de cálculo
    responseTime: Date.now() - responseTime
  };
}

// Inicializar servidor
async function startServer() {
  try {
    // Inicializar cliente AI Admin
    await initializeAiAdmin();
    
    app.listen(port, () => {
      console.log(\`🚀 Servidor rodando na porta \${port}\`);
      console.log(\`📡 Dashboard URL: \${process.env.DASHBOARD_URL}\`);
      console.log(\`🤖 Bot ID: \${process.env.BOT_ID}\`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();
`;

  const expressPath = path.join(process.cwd(), CONFIG_DIR, 'express-server.ts');
  fs.writeFileSync(expressPath, expressContent);
  console.log('✅ Integração Express criada: ai-admin-config/express-server.ts');
}

function createNextJsIntegration() {
  // API Route para chat
  const chatApiContent = `import { NextRequest, NextResponse } from 'next/server';
import { aiAdminClient, withAiAdmin } from '../../client';

export async function POST(request: NextRequest) {
  try {
    const { message, userId, tenantId } = await request.json();

    if (!message || !userId || !tenantId) {
      return NextResponse.json(
        { error: 'message, userId e tenantId são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await withAiAdmin(async (client) => {
      // 1. Criar sessão para o usuário
      const session = await client.createUserSession(userId, tenantId, {
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      try {
        // 2. Processar mensagem (SUBSTITUA PELA SUA LÓGICA)
        const response = await processMessage(message);

        // 3. Reportar uso automaticamente
        await client.reportUsage({
          sessionId: session.sessionId,
          userId,
          tenantId,
          action: 'chat_message',
          tokensUsed: response.tokensUsed,
          metadata: {
            messageLength: message.length,
            responseTime: response.responseTime
          }
        });

        return {
          response: response.content,
          sessionId: session.sessionId,
          tokensUsed: response.tokensUsed
        };

      } finally {
        // 4. Encerrar sessão
        await client.endUserSession(session.sessionId);
      }
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Erro no chat:', error);
    
    // Reportar erro automaticamente
    try {
      await aiAdminClient.reportError({
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'CHAT_ERROR',
        context: { endpoint: '/api/chat' }
      });
    } catch (reportError) {
      console.error('Erro ao reportar erro:', reportError);
    }

    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}

// Função de exemplo para processar mensagens
async function processMessage(message: string) {
  // SUBSTITUA ESTA FUNÇÃO PELA SUA LÓGICA DE IA/CHATBOT
  const responseTime = Date.now();
  
  // Simular processamento
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    content: \`Resposta para: \${message}\`,
    tokensUsed: Math.floor(message.length * 0.75), // Exemplo de cálculo
    responseTime: Date.now() - responseTime
  };
}
`;

  // API Route para status
  const statusApiContent = `import { NextRequest, NextResponse } from 'next/server';
import { aiAdminClient } from '../../client';

export async function GET(request: NextRequest) {
  try {
    const status = await aiAdminClient.getConnectionStatus();
    const stats = await aiAdminClient.getUsageStats();
    const sessions = aiAdminClient.getActiveSessions();
    
    return NextResponse.json({
      connected: status.connected,
      activeSessions: sessions.length,
      tokensUsed: stats.local?.totalTokens || 0,
      totalUsage: stats.local?.totalUsage || 0,
      lastPing: status.lastPing
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao obter status' },
      { status: 500 }
    );
  }
}
`;

  // API Route para webhook
  const webhookApiContent = `import { NextRequest, NextResponse } from 'next/server';
import { aiAdminClient } from '../../client';

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json();
    
    switch (type) {
      case 'ping':
        return NextResponse.json({ status: 'ok', timestamp: Date.now() });
        
      case 'status_check':
        const status = await aiAdminClient.getConnectionStatus();
        return NextResponse.json(status);
        
      default:
        return NextResponse.json(
          { error: 'Tipo de comando não suportado' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Erro no webhook:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
`;

  // Criar diretórios
  const apiDir = path.join(process.cwd(), CONFIG_DIR, 'app', 'api');
  const chatDir = path.join(apiDir, 'chat');
  const statusDir = path.join(apiDir, 'ai-admin', 'status');
  const webhookDir = path.join(apiDir, 'ai-admin', 'webhook');

  fs.mkdirSync(chatDir, { recursive: true });
  fs.mkdirSync(statusDir, { recursive: true });
  fs.mkdirSync(webhookDir, { recursive: true });

  // Criar arquivos
  fs.writeFileSync(path.join(chatDir, 'route.ts'), chatApiContent);
  fs.writeFileSync(path.join(statusDir, 'route.ts'), statusApiContent);
  fs.writeFileSync(path.join(webhookDir, 'route.ts'), webhookApiContent);

  console.log('✅ Integração Next.js criada:');
  console.log('   - ai-admin-config/app/api/chat/route.ts');
  console.log('   - ai-admin-config/app/api/ai-admin/status/route.ts');
  console.log('   - ai-admin-config/app/api/ai-admin/webhook/route.ts');
}

function createExampleUsage() {
  const exampleContent = `import { aiAdminClient, initializeAiAdmin, withAiAdmin } from './client';

/**
 * Exemplo completo de uso do AI Admin Client
 * Demonstra todas as funcionalidades principais
 */

async function exemploCompleto() {
  console.log('🚀 Iniciando exemplo do AI Admin Client v2.0\\n');

  try {
    // 1. Inicializar cliente
    console.log('📡 Conectando ao dashboard...');
    await initializeAiAdmin();
    console.log('✅ Conectado com sucesso!\\n');

    // 2. Criar sessão para usuário
    console.log('👤 Criando sessão para usuário...');
    const session = await aiAdminClient.createUserSession('user-123', 'tenant-456', {
      userAgent: 'ExemploApp/1.0',
      ip: '192.168.1.100'
    });
    console.log(\`✅ Sessão criada: \${session.sessionId}\\n\`);

    // 3. Simular uso do bot
    console.log('🤖 Simulando interações do bot...');
    
    // Chat
    await aiAdminClient.reportUsage({
      sessionId: session.sessionId,
      userId: 'user-123',
      tenantId: 'tenant-456',
      action: 'chat_message',
      tokensUsed: 50,
      metadata: { messageType: 'text', responseTime: 1200 }
    });
    console.log('📊 Uso reportado: Chat (50 tokens)');

    // Geração de imagem
    await aiAdminClient.reportUsage({
      sessionId: session.sessionId,
      userId: 'user-123',
      tenantId: 'tenant-456',
      action: 'image_generation',
      tokensUsed: 100,
      metadata: { imageSize: '1024x1024', style: 'realistic' }
    });
    console.log('📊 Uso reportado: Imagem (100 tokens)');

    // 4. Simular um erro
    console.log('\\n⚠️ Simulando um erro...');
    await aiAdminClient.reportError({
      sessionId: session.sessionId,
      userId: 'user-123',
      tenantId: 'tenant-456',
      error: 'Rate limit exceeded',
      errorCode: 'RATE_LIMIT_ERROR',
      context: {
        currentRequests: 100,
        limit: 100,
        resetTime: Date.now() + 3600000
      }
    });
    console.log('🐛 Erro reportado: Rate limit');

    // 5. Verificar status e estatísticas
    console.log('\\n📈 Verificando status...');
    const status = await aiAdminClient.getConnectionStatus();
    console.log('Conexão:', status.connected ? '🟢 Ativa' : '🔴 Inativa');
    
    const stats = await aiAdminClient.getUsageStats();
    console.log('Estatísticas:', {
      totalTokens: stats.local?.totalTokens || 0,
      totalInterações: stats.local?.totalUsage || 0
    });

    const sessionsAtivas = aiAdminClient.getActiveSessions();
    console.log('Sessões ativas:', sessionsAtivas.length);

    // 6. Encerrar sessão
    console.log('\\n🔚 Encerrando sessão...');
    await aiAdminClient.endUserSession(session.sessionId);
    console.log('✅ Sessão encerrada');

  } catch (error) {
    console.error('❌ Erro durante execução:', error);
  } finally {
    // 7. Sempre encerrar o cliente
    console.log('\\n🔌 Desconectando cliente...');
    await aiAdminClient.shutdown();
    console.log('✅ Cliente desconectado');
  }
}

// Exemplo de uso com helper
async function exemploComHelper() {
  console.log('\\n🔧 Exemplo usando helper withAiAdmin...');
  
  await withAiAdmin(async (client) => {
    const session = await client.createUserSession('user-456', 'tenant-789');
    
    await client.reportUsage({
      sessionId: session.sessionId,
      userId: 'user-456',
      tenantId: 'tenant-789',
      action: 'text_completion',
      tokensUsed: 75
    });
    
    await client.endUserSession(session.sessionId);
    console.log('✅ Helper executado com sucesso');
  });
}

// Executar exemplos
if (require.main === module) {
  exemploCompleto()
    .then(() => exemploComHelper())
    .then(() => {
      console.log('\\n🎉 Exemplos concluídos! Package está pronto para uso.');
    })
    .catch(console.error);
}

export { exemploCompleto, exemploComHelper };
`;

  const examplePath = path.join(process.cwd(), CONFIG_DIR, 'exemplo.ts');
  fs.writeFileSync(examplePath, exampleContent);
  console.log('✅ Exemplo de uso criado: ai-admin-config/exemplo.ts');
}

function createPackageJson() {
  const projectType = isNextJsProject() ? 'nextjs' : isExpressProject() ? 'express' : 'standalone';
  
  const packageContent = {
    "name": "ai-admin-integration",
    "version": "1.0.0",
    "description": `Integração com AI Admin Dashboard - ${projectType}`,
    "main": projectType === 'express' ? 'express-server.ts' : 'exemplo.ts',
    "scripts": {
      "start": projectType === 'express' ? "ts-node express-server.ts" : "ts-node exemplo.ts",
      "dev": projectType === 'express' ? "ts-node-dev --respawn express-server.ts" : "ts-node-dev --respawn exemplo.ts",
      "test": "ts-node exemplo.ts",
      "build": "tsc"
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

function createReadme() {
  const projectType = isNextJsProject() ? 'Next.js' : isExpressProject() ? 'Express' : 'Standalone';
  
  const readmeContent = `# AI Admin Client - Integração ${projectType}

## 🚀 Setup Completo Criado!

Este diretório contém toda a configuração necessária para integrar sua aplicação ${projectType} com o AI Admin Dashboard.

### 📁 Arquivos Criados

- \`.env\` - Configurações de ambiente
- \`.env.example\` - Template de configurações
- \`client.ts\` - Cliente configurado do AI Admin
- \`exemplo.ts\` - Exemplo completo de uso
${isExpressProject() ? '- `express-server.ts` - Servidor Express integrado' : ''}
${isNextJsProject() ? '- `app/api/\` - API Routes do Next.js' : ''}
- \`package.json\` - Dependências do projeto
- \`README.md\` - Esta documentação

## ⚙️ Configuração (3 passos)

### 1. Configure as variáveis de ambiente
\`\`\`bash
# Edite o arquivo .env com suas configurações
nano .env

# Principais configurações:
# DASHBOARD_URL=http://localhost:3000
# BOT_ID=seu-bot-id-aqui
# BOT_SECRET=seu-bot-secret-aqui
\`\`\`

### 2. Instale as dependências
\`\`\`bash
npm install
\`\`\`

### 3. Execute
\`\`\`bash
# Executar exemplo
npm run test

# Executar aplicação
npm start

# Modo desenvolvimento
npm run dev
\`\`\`

## 🔗 Solicitação de Conexão

Para solicitar registro no dashboard, use:
\`\`\`bash
npx ai-admin-request \\
  --name "Nome do seu Bot" \\
  --email "seu@email.com" \\
  --website "http://localhost:3001" \\
  --description "Descrição do bot"
\`\`\`

## 📊 Funcionalidades Incluídas

### ✅ Conexão Automática
- Autenticação com dashboard
- Reconexão em falhas
- Heartbeat automático

### ✅ Múltiplos Usuários
- Sistema de sessões
- Validação de permissões
- Isolamento de dados

### ✅ Telemetria Automática
- Relatórios de uso de tokens
- Estatísticas em tempo real
- Envio em lotes otimizado

### ✅ Relatório de Erros
- Captura automática de erros
- Categorização por gravidade
- Context detalhado

## 🛠️ Endpoints Disponíveis

${isExpressProject() || isNextJsProject() ? `
### API Endpoints
- \`POST /api/chat\` - Endpoint de chat integrado
- \`GET /api/ai-admin/status\` - Status da conexão
- \`POST /api/ai-admin/webhook\` - Webhook do dashboard
` : ''}

## 🔧 Personalização

### Processamento de Mensagens
Edite a função \`processMessage()\` nos arquivos de API para implementar sua lógica de IA/chatbot.

### Configurações Avançadas
Modifique o arquivo \`client.ts\` para ajustar configurações específicas.

### Eventos de Monitoramento
O cliente emite eventos que você pode ouvir para monitoramento customizado.

## 📚 Documentação Completa

Consulte a documentação completa do package:
- README principal do dengun_ai-admin-client
- Exemplos em \`exemplo.ts\`
- Código comentado nos arquivos de integração

## 🆘 Solução de Problemas

### Erro de Conexão
- Verifique se DASHBOARD_URL está correto
- Confirme se o dashboard está rodando
- Valide BOT_ID e BOT_SECRET

### Erro de Autenticação
- Solicite registro com \`npx ai-admin-request\`
- Aguarde aprovação do administrador
- Verifique logs do dashboard

### Problemas de Tokens
- Confirme se o usuário tem tokens disponíveis
- Verifique limites configurados no dashboard
- Monitore uso através do endpoint de status

---

**🎉 Sua aplicação está pronta para conectar ao AI Admin Dashboard!**
`;

  const readmePath = path.join(process.cwd(), CONFIG_DIR, 'README.md');
  fs.writeFileSync(readmePath, readmeContent);
  console.log('✅ Documentação criada: ai-admin-config/README.md');
}

function main() {
  console.log('\n🚀 AI Admin Client - Setup Completo para Integração\n');

  // Detectar tipo de projeto
  const projectType = isNextJsProject() ? 'Next.js' : isExpressProject() ? 'Express' : 'Standalone';
  console.log(`📦 Projeto detectado: ${projectType}`);

  // Criar diretório
  const configDir = path.join(process.cwd(), CONFIG_DIR);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log('📁 Diretório criado: ai-admin-config/');
  }

  // Criar arquivos essenciais
  createEnvFile();
  createClientSetup();
  createExampleUsage();
  createPackageJson();
  createReadme();

  // Criar integração específica do projeto
  if (isExpressProject()) {
    createExpressIntegration();
  } else if (isNextJsProject()) {
    createNextJsIntegration();
  }

  console.log('\n✨ Setup completo criado!\n');
  console.log('📋 Próximos passos:');
  console.log('1. cd ai-admin-config');
  console.log('2. Editar .env com suas configurações');
  console.log('3. npm install');
  console.log('4. npx ai-admin-request --name "Seu Bot" --email "seu@email.com"');
  console.log('5. npm start\n');
  console.log('💡 Tudo configurado! Sua aplicação está pronta para conectar! 🎉');
}

main();
