# AI Admin Client v2.0 - Plug and Play

Cliente simples e genérico para integração com o AI Admin Dashboard. Focado em 4 objetivos principais:

1. **🔗 Conexão**: Garantir conexão entre apps AI Admin Dashboard e aplicações externas
2. **👥 Múltiplos usuários**: Permitir que usuários do dashboard usem o bot simultaneamente  
3. **📊 Telemetria**: Enviar dados sobre consumo do bot automaticamente
4. **🐛 Relatórios**: Reportar erros, bugs e falhas automaticamente

## 🚀 Instalação e Uso (3 comandos)

```bash
# 1. Instalar o pacote
npm install dengun_ai-admin-client

# 2. Inicializar configuração
npx ai-admin-init

# 3. Configurar e usar
cd ai-admin-config && cp .env.example .env
# Editar .env com suas configurações
npm install && npm start
```

## 📋 Uso Básico

```typescript
import { AiAdminClient } from 'dengun_ai-admin-client';

// Configuração mínima - apenas 3 parâmetros
const client = new AiAdminClient({
  dashboardUrl: 'http://localhost:3000',
  botId: 'seu-bot-id',
  botSecret: 'seu-bot-secret'
});

async function exemplo() {
  // 1. Conectar ao dashboard
  await client.initialize();

  // 2. Criar sessão para usuário
  const session = await client.createUserSession('user123', 'tenant456');

  // 3. Reportar uso (automático)
  await client.reportUsage({
    sessionId: session.sessionId,
    userId: 'user123',
    tenantId: 'tenant456',
    action: 'chat_message',
    tokensUsed: 150
  });

  // 4. Reportar erro se necessário (automático)
  await client.reportError({
    error: 'Algo deu errado',
    errorCode: 'CUSTOM_ERROR'
  });

  // Encerrar
  await client.endUserSession(session.sessionId);
  await client.shutdown();
}
```

## ⚙️ Configuração Avançada

```typescript
const client = new AiAdminClient({
  dashboardUrl: 'http://localhost:3000',
  botId: 'meu-bot',
  botSecret: 'meu-secret',
  options: {
    autoReportUsage: true,    // Relatório automático de uso
    autoReportErrors: true,   // Relatório automático de erros
    reportInterval: 30000,    // Intervalo de relatórios (30s)
    timeout: 10000,           // Timeout de conexão (10s)
    debug: false              // Logs de debug
  }
});
```

## 🎯 4 Objetivos Principais

### 1. Conexão entre Apps
- Autenticação automática com o dashboard
- Reconexão automática em caso de falha
- Ping periódico para manter conexão ativa
- Gerenciamento de tokens transparente

### 2. Múltiplos Usuários Simultâneos
- Sistema de sessões por usuário
- Validação automática de permissões
- Suporte a vários tenants
- Isolamento de dados por usuário

### 3. Telemetria Automática
- Relatório automático de uso de tokens
- Estatísticas de sessões ativas
- Métricas de performance
- Dados enviados em lotes otimizados

### 4. Relatório de Erros
- Captura automática de erros não tratados
- Relatórios detalhados com stack traces
- Categorização de erros por gravidade
- Contexto automático das sessões

## 📊 API Reference

### AiAdminClient

#### Métodos Principais

- `initialize()` - Conecta ao dashboard
- `createUserSession(userId, tenantId)` - Cria sessão de usuário
- `reportUsage(usage)` - Reporta uso do bot
- `reportError(error)` - Reporta erro
- `endUserSession(sessionId)` - Encerra sessão
- `shutdown()` - Desconecta e limpa recursos

#### Métodos de Monitoramento

- `getConnectionStatus()` - Status da conexão
- `getActiveSessions()` - Sessões ativas
- `getUsageStats()` - Estatísticas de uso

#### Eventos

```typescript
client.on('connected', () => console.log('Conectado'));
client.on('disconnected', () => console.log('Desconectado'));
client.on('sessionCreated', (session) => console.log('Sessão criada'));
client.on('usageReported', (usage) => console.log('Uso reportado'));
client.on('errorReported', (error) => console.log('Erro reportado'));
```

## 🔧 Variáveis de Ambiente

```env
# Obrigatórias
DASHBOARD_URL=http://localhost:3000
BOT_ID=seu-bot-id
BOT_SECRET=seu-bot-secret

# Opcionais (com valores padrão)
AUTO_REPORT_USAGE=true
AUTO_REPORT_ERRORS=true  
REPORT_INTERVAL=30000
DEBUG=false
```

## 🏗️ Integração em Projeto Existente

### Express.js
```typescript
import express from 'express';
import { AiAdminClient } from 'dengun_ai-admin-client';

const app = express();
const aiClient = new AiAdminClient({ /* config */ });

app.post('/chat', async (req, res) => {
  const { userId, tenantId, message } = req.body;
  
  // Criar sessão
  const session = await aiClient.createUserSession(userId, tenantId);
  
  // Processar chat...
  const response = processChat(message);
  
  // Reportar uso
  await aiClient.reportUsage({
    sessionId: session.sessionId,
    userId,
    tenantId,
    action: 'chat',
    tokensUsed: response.tokensUsed
  });
  
  res.json(response);
});
```

### Next.js
```typescript
// pages/api/chat.ts
import { AiAdminClient } from 'dengun_ai-admin-client';

const client = new AiAdminClient({ /* config */ });

export default async function handler(req, res) {
  const session = await client.createUserSession(
    req.body.userId, 
    req.body.tenantId
  );
  
  // Processar...
  await client.reportUsage({ /* dados */ });
  
  res.json({ success: true });
}
```

## 🔍 Monitoramento e Debug

### Logs de Debug
```typescript
const client = new AiAdminClient({
  // ...
  options: { debug: true }
});
```

### Métricas Customizadas
```typescript
// Reportar evento customizado
await client.reportError({
  error: 'Rate limit exceeded',
  errorCode: 'RATE_LIMIT',
  context: { 
    limit: 100,
    current: 150,
    resetTime: Date.now() + 3600000
  }
});
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT - Consulte o arquivo LICENSE para detalhes.

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/dengun/ai-admin-dashboard/issues)
- **Documentação**: [GitHub Wiki](https://github.com/dengun/ai-admin-dashboard/wiki)
- **Email**: support@dengun.com
