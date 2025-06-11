# Guia de Migração v1.x → v2.0

## 🎯 Resumo da Refatoração

A versão 2.0 representa uma **refatoração completa** do package, tornando-o mais:
- **Simples**: API unificada com apenas uma classe principal
- **Genérico**: Funciona com qualquer tipo de aplicação
- **Focado**: 4 objetivos específicos e bem definidos
- **Plug & Play**: Configuração mínima e funcionamento imediato

## 🔄 Principais Mudanças

### API Principal
```typescript
// ❌ ANTES (v1.x)
import { BotConnection, TokenManager, TelemetryService } from 'dengun_ai-admin-client';

const connection = new BotConnection(config);
const tokenManager = new TokenManager(config);
const telemetry = new TelemetryService(config);

await connection.connect();
await tokenManager.authenticate();

// ✅ AGORA (v2.0)
import { AiAdminClient } from 'dengun_ai-admin-client';

const client = new AiAdminClient(config);
await client.initialize(); // Faz tudo automaticamente
```

### Configuração
```typescript
// ❌ ANTES (v1.x) - Complexa
const config = {
  baseUrl: 'http://localhost:3000/api',
  apiUrl: 'http://localhost:3000/api',
  botId: 'meu-bot',
  token: 'token-complexo',
  userId: 'user-atual',
  tenantId: 'tenant-atual',
  options: {
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 10000
  }
};

// ✅ AGORA (v2.0) - Simples
const config = {
  dashboardUrl: 'http://localhost:3000',
  botId: 'meu-bot',
  botSecret: 'meu-secret'
  // Opções são todas automáticas!
};
```

## 📋 Mapeamento de Funcionalidades

### 1. Conexão e Autenticação
```typescript
// ❌ ANTES
const connection = new BotConnection(config);
await connection.connect();
const status = await connection.ping();

// ✅ AGORA
const client = new AiAdminClient(config);
await client.initialize();
const status = await client.getConnectionStatus();
```

### 2. Gestão de Usuários
```typescript
// ❌ ANTES - Manual
// Não havia sistema de sessões unificado

// ✅ AGORA - Automático
const session = await client.createUserSession('userId', 'tenantId');
// Validação automática de permissões
// Isolamento de dados por usuário
```

### 3. Telemetria
```typescript
// ❌ ANTES
const telemetry = TelemetryService.getInstance(config);
await telemetry.reportTokenUsage(tokens, 'action', 'chatId');

// ✅ AGORA
await client.reportUsage({
  sessionId: session.sessionId,
  userId: 'user123',
  tenantId: 'tenant456',
  action: 'chat_message',
  tokensUsed: 150
});
// Relatório automático se autoReportUsage: true
```

### 4. Relatório de Erros
```typescript
// ❌ ANTES
await telemetry.reportError(error, context);

// ✅ AGORA
await client.reportError({
  error: 'Mensagem do erro',
  errorCode: 'CODIGO_ERRO',
  context: { dados: 'adicionais' }
});
// Captura automática de erros se autoReportErrors: true
```

## 🚀 Passos de Migração

### 1. Desinstalar Versão Antiga
```bash
npm uninstall dengun_ai-admin-client
```

### 2. Instalar Nova Versão
```bash
npm install dengun_ai-admin-client@^2.0.0
```

### 3. Inicializar Configuração
```bash
npx ai-admin-init
```

### 4. Atualizar Código

#### Imports
```typescript
// ❌ Remover
import { 
  BotConnection, 
  TokenManager, 
  TelemetryService,
  PublicKeyManager 
} from 'dengun_ai-admin-client';

// ✅ Adicionar
import { AiAdminClient } from 'dengun_ai-admin-client';
```

#### Inicialização
```typescript
// ❌ Antes - Múltiplas classes
const connection = new BotConnection(config);
const telemetry = TelemetryService.getInstance(config);
await connection.connect();

// ✅ Agora - Uma classe
const client = new AiAdminClient(config);
await client.initialize();
```

#### Uso do Bot
```typescript
// ❌ Antes - Manual
async function usarBot(userId, tenantId, acao) {
  // Validar usuário manualmente
  const tokens = await executarAcao(acao);
  await telemetry.reportTokenUsage(tokens, acao);
}

// ✅ Agora - Automatizado
async function usarBot(userId, tenantId, acao) {
  const session = await client.createUserSession(userId, tenantId);
  const tokens = await executarAcao(acao);
  
  await client.reportUsage({
    sessionId: session.sessionId,
    userId,
    tenantId,
    action: acao,
    tokensUsed: tokens
  });
  
  await client.endUserSession(session.sessionId);
}
```

## 🔧 Configurações Equivalentes

### Variáveis de Ambiente
```env
# ❌ ANTES
BOT_NAME=meu-bot
DASHBOARD_URL=http://localhost:3000
BOT_TOKEN=token-complexo

# ✅ AGORA
DASHBOARD_URL=http://localhost:3000
BOT_ID=meu-bot
BOT_SECRET=meu-secret
```

### Opções Avançadas
```typescript
// ❌ ANTES
{
  retryAttempts: 3,
  retryDelay: 1000,
  timeout: 10000,
  debug: false
}

// ✅ AGORA
{
  autoReportUsage: true,
  autoReportErrors: true,
  reportInterval: 30000,
  maxRetries: 3,
  timeout: 10000,
  debug: false
}
```

## 📊 Benefícios da Migração

### 🎯 Simplicidade
- **-80% código**: Uma classe vs múltiplas
- **-60% configuração**: 3 parâmetros vs 6+
- **-90% setup**: Script automático vs manual

### 🚀 Performance
- **Conexão única**: Não há múltiplas conexões
- **Envio em lotes**: Telemetria otimizada
- **Cache inteligente**: Menos requisições

### 🛡️ Confiabilidade
- **Reconexão automática**: Falhas transparentes
- **Filas resilientes**: Dados não se perdem
- **Validação automática**: Menos erros humanos

### 👥 Experiência
- **Multi-usuário nativo**: Sessões isoladas
- **Eventos em tempo real**: Monitoramento
- **Debug integrado**: Logs estruturados

## 🔍 Exemplo Completo de Migração

### Antes (v1.x)
```typescript
import { BotConnection, TelemetryService } from 'dengun_ai-admin-client';

const config = {
  baseUrl: 'http://localhost:3000/api',
  botId: 'chatbot',
  token: 'abc123',
  userId: 'current-user',
  tenantId: 'current-tenant'
};

const connection = new BotConnection(config);
const telemetry = TelemetryService.getInstance(config);

await connection.connect();

// Para cada usuário, gestão manual
async function handleChat(userId, message) {
  try {
    const response = await processMessage(message);
    await telemetry.reportTokenUsage(response.tokens, 'chat');
    return response;
  } catch (error) {
    await telemetry.reportError(error);
    throw error;
  }
}
```

### Depois (v2.0)
```typescript
import { AiAdminClient } from 'dengun_ai-admin-client';

const client = new AiAdminClient({
  dashboardUrl: 'http://localhost:3000',
  botId: 'chatbot',
  botSecret: 'secret123'
  // Relatórios automáticos habilitados por padrão
});

await client.initialize();

// Para cada usuário, gestão automática
async function handleChat(userId, tenantId, message) {
  const session = await client.createUserSession(userId, tenantId);
  
  try {
    const response = await processMessage(message);
    
    // Relatório automático
    await client.reportUsage({
      sessionId: session.sessionId,
      userId,
      tenantId,
      action: 'chat',
      tokensUsed: response.tokens
    });
    
    return response;
  } catch (error) {
    // Relatório automático de erro
    await client.reportError({
      sessionId: session.sessionId,
      error: error.message,
      errorCode: 'CHAT_ERROR'
    });
    throw error;
  } finally {
    await client.endUserSession(session.sessionId);
  }
}
```

## ❓ FAQ da Migração

### Q: Posso usar v1.x e v2.0 juntas?
**R:** Não recomendado. São arquiteturas diferentes e podem causar conflitos.

### Q: Todos os dados são mantidos?
**R:** Sim, a migração é transparente para o dashboard. Apenas o cliente muda.

### Q: E se eu tiver customizações na v1.x?
**R:** A v2.0 é mais flexível. Use eventos e metadata para personalizar.

### Q: Performance será afetada?
**R:** Melhorada! Menos conexões, envio em lotes e cache inteligente.

### Q: Preciso atualizar o dashboard?
**R:** Não! O package é compatível com dashboards existentes.

## 🆘 Suporte à Migração

- **Issues**: [GitHub Issues](https://github.com/dengun/ai-admin-dashboard/issues)
- **Documentação**: README.md completo
- **Exemplos**: Pasta `/examples`
- **Changelog**: CHANGELOG.md detalhado

---

**💡 Dica**: Use o script `npx ai-admin-init` para gerar uma configuração de exemplo e compare com seu código atual! 