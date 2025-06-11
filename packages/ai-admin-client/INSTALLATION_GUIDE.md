# 📦 Guia de Instalação - AI Admin Client v2.0

## 🎯 Visão Geral

Este guia explica como instalar e configurar o `dengun_ai-admin-client` em sua aplicação externa para conectar ao AI Admin Dashboard. O processo foi projetado para ser **plug-and-play** com configuração mínima.

## 🚀 Instalação Rápida (3 minutos)

### 1. Instalar o Package
```bash
npm install dengun_ai-admin-client
```

### 2. Configuração Automática (Opcional)
```bash
npx ai-admin-init
```
Este comando cria uma pasta `ai-admin-config/` com:
- Template de configuração (`.env.example`)
- Exemplo de código (`exemplo.ts`)
- Documentação (`README.md`)
- Package.json configurado

### 3. Uso Básico
```typescript
import { AiAdminClient } from 'dengun_ai-admin-client';

const client = new AiAdminClient({
  dashboardUrl: 'http://localhost:3000',
  botId: 'seu-bot-id',
  botSecret: 'seu-bot-secret'
});

await client.initialize();
// Pronto para usar!
```

## 📋 Pré-requisitos

### Sistema
- **Node.js**: Versão 16 ou superior
- **npm/yarn**: Para gerenciamento de dependências
- **TypeScript**: Opcional, mas recomendado

### Dashboard AI Admin
- Dashboard rodando e acessível
- Bot cadastrado no dashboard
- `botId` e `botSecret` do seu bot

## 🔧 Configuração Detalhada

### Opção 1: Configuração Manual

#### 1.1. Instalar Dependências
```bash
npm install dengun_ai-admin-client
```

#### 1.2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do seu projeto:

```env
# Configurações Obrigatórias
DASHBOARD_URL=http://localhost:3000
BOT_ID=seu-bot-id
BOT_SECRET=seu-bot-secret

# Configurações Opcionais (com valores padrão)
AUTO_REPORT_USAGE=true
AUTO_REPORT_ERRORS=true
REPORT_INTERVAL=30000
DEBUG=false
```

#### 1.3. Código Básico
```typescript
// src/ai-client.ts
import { AiAdminClient } from 'dengun_ai-admin-client';
import dotenv from 'dotenv';

dotenv.config();

export const aiClient = new AiAdminClient({
  dashboardUrl: process.env.DASHBOARD_URL!,
  botId: process.env.BOT_ID!,
  botSecret: process.env.BOT_SECRET!
});
```

### Opção 2: Configuração Automática

#### 2.1. Usar o Script de Inicialização
```bash
npx ai-admin-init
```

#### 2.2. Personalizar a Configuração
```bash
cd ai-admin-config
cp .env.example .env
# Editar o .env com suas configurações
```

#### 2.3. Instalar e Executar
```bash
npm install
npm start
```

## 🏗️ Integração em Projetos Existentes

### Express.js

#### Instalação
```bash
npm install dengun_ai-admin-client express
npm install -D @types/express
```

#### Configuração
```typescript
// app.ts
import express from 'express';
import { AiAdminClient } from 'dengun_ai-admin-client';

const app = express();
const port = 3001;

// Configurar cliente AI Admin
const aiClient = new AiAdminClient({
  dashboardUrl: process.env.DASHBOARD_URL!,
  botId: process.env.BOT_ID!,
  botSecret: process.env.BOT_SECRET!
});

// Inicializar na startup
async function startServer() {
  try {
    await aiClient.initialize();
    console.log('✅ Conectado ao AI Admin Dashboard');
    
    app.listen(port, () => {
      console.log(`🚀 Servidor rodando na porta ${port}`);
    });
  } catch (error) {
    console.error('❌ Erro ao conectar:', error);
    process.exit(1);
  }
}

// Middleware para parsing JSON
app.use(express.json());

// Endpoint para chat
app.post('/api/chat', async (req, res) => {
  const { userId, tenantId, message } = req.body;
  
  try {
    // Criar sessão para o usuário
    const session = await aiClient.createUserSession(userId, tenantId);
    
    // Processar mensagem (sua lógica aqui)
    const response = await processMessage(message);
    
    // Reportar uso automaticamente
    await aiClient.reportUsage({
      sessionId: session.sessionId,
      userId,
      tenantId,
      action: 'chat',
      tokensUsed: response.tokensUsed
    });
    
    // Encerrar sessão
    await aiClient.endUserSession(session.sessionId);
    
    res.json({
      message: response.text,
      sessionId: session.sessionId
    });
  } catch (error) {
    console.error('Erro no chat:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await aiClient.shutdown();
  process.exit(0);
});

startServer();

// Função de exemplo para processamento
async function processMessage(message: string) {
  // Aqui você coloca sua lógica de IA/chatbot
  return {
    text: `Echo: ${message}`,
    tokensUsed: message.length * 0.1 // Exemplo
  };
}
```

### Next.js

#### Instalação
```bash
npm install dengun_ai-admin-client
```

#### Configuração Global
```typescript
// lib/ai-client.ts
import { AiAdminClient } from 'dengun_ai-admin-client';

let aiClient: AiAdminClient | null = null;

export function getAiClient(): AiAdminClient {
  if (!aiClient) {
    aiClient = new AiAdminClient({
      dashboardUrl: process.env.DASHBOARD_URL!,
      botId: process.env.BOT_ID!,
      botSecret: process.env.BOT_SECRET!
    });
  }
  return aiClient;
}

export async function initializeAiClient(): Promise<void> {
  const client = getAiClient();
  if (!client.isInitialized) {
    await client.initialize();
  }
}
```

#### API Route
```typescript
// pages/api/chat.ts (ou app/api/chat/route.ts para App Router)
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAiClient, initializeAiClient } from '../../lib/ai-client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = getAiClient();
    await initializeAiClient();

    const { userId, tenantId, message } = req.body;

    // Criar sessão
    const session = await client.createUserSession(userId, tenantId);

    // Processar (sua lógica)
    const response = await processMessage(message);

    // Reportar uso
    await client.reportUsage({
      sessionId: session.sessionId,
      userId,
      tenantId,
      action: 'chat',
      tokensUsed: response.tokensUsed
    });

    await client.endUserSession(session.sessionId);

    res.json(response);
  } catch (error) {
    console.error('Erro na API:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function processMessage(message: string) {
  // Sua lógica aqui
  return {
    text: `Resposta para: ${message}`,
    tokensUsed: 100
  };
}
```

### Aplicação Standalone

```typescript
// main.ts
import { AiAdminClient } from 'dengun_ai-admin-client';

class BotApplication {
  private aiClient: AiAdminClient;

  constructor() {
    this.aiClient = new AiAdminClient({
      dashboardUrl: process.env.DASHBOARD_URL!,
      botId: process.env.BOT_ID!,
      botSecret: process.env.BOT_SECRET!,
      options: {
        debug: true
      }
    });
  }

  async start(): Promise<void> {
    try {
      await this.aiClient.initialize();
      console.log('🤖 Bot iniciado e conectado ao dashboard');
      
      // Configurar handlers de eventos
      this.setupEventHandlers();
      
      // Sua lógica de aplicação aqui
      await this.runBot();
    } catch (error) {
      console.error('❌ Erro ao iniciar bot:', error);
      process.exit(1);
    }
  }

  private setupEventHandlers(): void {
    this.aiClient.on('connected', () => {
      console.log('🔗 Conectado ao dashboard');
    });

    this.aiClient.on('disconnected', () => {
      console.log('🔌 Desconectado do dashboard');
    });

    this.aiClient.on('sessionCreated', (session) => {
      console.log('👤 Nova sessão:', session.sessionId);
    });

    this.aiClient.on('usageReported', (usage) => {
      console.log('📊 Uso reportado:', usage.tokensUsed, 'tokens');
    });
  }

  private async runBot(): Promise<void> {
    // Simular interações
    const session = await this.aiClient.createUserSession('user123', 'tenant456');
    
    // Simular uso
    await this.aiClient.reportUsage({
      sessionId: session.sessionId,
      userId: 'user123',
      tenantId: 'tenant456',
      action: 'chat',
      tokensUsed: 150
    });

    await this.aiClient.endUserSession(session.sessionId);
  }

  async stop(): Promise<void> {
    await this.aiClient.shutdown();
    console.log('🛑 Bot parado');
  }
}

// Executar
const bot = new BotApplication();

bot.start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  await bot.stop();
  process.exit(0);
});
```

## ⚙️ Configurações Avançadas

### Configuração Completa
```typescript
const client = new AiAdminClient({
  // Obrigatório
  dashboardUrl: 'http://localhost:3000',
  botId: 'meu-bot',
  botSecret: 'meu-secret',
  
  // Opcional
  options: {
    autoReportUsage: true,      // Reportar uso automaticamente
    autoReportErrors: true,     // Reportar erros automaticamente
    reportInterval: 30000,      // Intervalo de relatórios (30s)
    maxRetries: 3,              // Tentativas de reconexão
    timeout: 10000,             // Timeout de requisições (10s)
    debug: false                // Logs de debug
  }
});
```

### Monitoramento Avançado
```typescript
// Eventos de monitoramento
client.on('connected', () => console.log('Conectado'));
client.on('disconnected', () => console.log('Desconectado'));
client.on('sessionCreated', (session) => console.log('Nova sessão:', session));
client.on('usageReported', (usage) => console.log('Uso reportado:', usage));
client.on('errorReported', (error) => console.log('Erro reportado:', error));

// Verificar status
const status = await client.getConnectionStatus();
console.log('Status:', status);

// Obter estatísticas
const stats = await client.getUsageStats();
console.log('Estatísticas:', stats);

// Listar sessões ativas
const sessions = client.getActiveSessions();
console.log('Sessões ativas:', sessions.length);
```

## 🔒 Segurança

### Variáveis de Ambiente
```bash
# Nunca commitar os secrets no código
BOT_SECRET=seu-secret-real-aqui
```

### Validação de Usuários
```typescript
// O cliente valida automaticamente no dashboard
try {
  const session = await client.createUserSession(userId, tenantId);
  // Usuário válido com permissões
} catch (error) {
  // Usuário sem acesso ou tokens insuficientes
  console.error('Acesso negado:', error.message);
}
```

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. Erro de Conexão
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```
**Solução**: Verificar se o dashboard está rodando na URL correta.

#### 2. Autenticação Falhada
```
Error: Usuário não autorizado: Invalid bot credentials
```
**Solução**: Verificar `botId` e `botSecret` no dashboard.

#### 3. Usuário Sem Acesso
```
Error: Usuário não autorizado: User does not have access to this bot
```
**Solução**: Configurar permissões do usuário no dashboard.

#### 4. Timeout
```
Error: timeout of 10000ms exceeded
```
**Solução**: Aumentar o timeout ou verificar conectividade.

### Debug
```typescript
// Habilitar logs detalhados
const client = new AiAdminClient({
  // ...
  options: { debug: true }
});
```

### Verificar Saúde da Conexão
```typescript
const status = await client.getConnectionStatus();
if (!status.connected) {
  console.error('Não conectado:', status.error);
}
```

## 📊 Testes

### Teste de Instalação
```typescript
// test-installation.ts
import { AiAdminClient } from 'dengun_ai-admin-client';

async function testInstallation() {
  const client = new AiAdminClient({
    dashboardUrl: 'http://localhost:3000',
    botId: 'test-bot',
    botSecret: 'test-secret'
  });

  try {
    await client.initialize();
    console.log('✅ Instalação OK');
    
    const status = await client.getConnectionStatus();
    console.log('✅ Conexão OK:', status.connected);
    
    await client.shutdown();
    console.log('✅ Shutdown OK');
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testInstallation();
```

### Teste de Integração
```typescript
// test-integration.ts
import { AiAdminClient } from 'dengun_ai-admin-client';

async function testIntegration() {
  const client = new AiAdminClient({
    dashboardUrl: process.env.DASHBOARD_URL!,
    botId: process.env.BOT_ID!,
    botSecret: process.env.BOT_SECRET!
  });

  await client.initialize();

  // Teste de sessão
  const session = await client.createUserSession('test-user', 'test-tenant');
  console.log('✅ Sessão criada:', session.sessionId);

  // Teste de uso
  await client.reportUsage({
    sessionId: session.sessionId,
    userId: 'test-user',
    tenantId: 'test-tenant',
    action: 'test',
    tokensUsed: 1
  });
  console.log('✅ Uso reportado');

  // Teste de erro
  await client.reportError({
    error: 'Teste de erro',
    errorCode: 'TEST_ERROR'
  });
  console.log('✅ Erro reportado');

  await client.endUserSession(session.sessionId);
  await client.shutdown();
  console.log('✅ Todos os testes passaram');
}

testIntegration().catch(console.error);
```

## 📚 Próximos Passos

1. **Execute o exemplo**: `npx ai-admin-init && cd ai-admin-config && npm install && npm start`
2. **Integre em sua aplicação**: Use os exemplos de Express.js ou Next.js
3. **Configure monitoramento**: Adicione listeners de eventos
4. **Teste em produção**: Valide com usuarios reais
5. **Consulte a documentação**: README.md para referência completa

## 🆘 Suporte

- **Issues**: [GitHub Issues](https://github.com/dengun/ai-admin-dashboard/issues)
- **Documentação**: README.md completo
- **Exemplos**: Pasta `/examples`
- **Changelog**: CHANGELOG.md

---

**💡 Dica**: O package foi projetado para ser plug-and-play. Se você seguiu os passos básicos e ainda tem problemas, verifique se o dashboard está acessível e se as credenciais estão corretas! 