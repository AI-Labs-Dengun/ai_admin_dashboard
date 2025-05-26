# dengun_ai-admin-client

Cliente para integração com o AI Admin Dashboard, permitindo que bots externos se conectem de forma segura ao sistema.

## Instalação

```bash
npm install dengun_ai-admin-client
```

## Configuração do Bot

Antes de usar o cliente, você precisa configurar algumas variáveis de ambiente:

```bash
BOT_NAME="Nome do seu bot"
BOT_DESCRIPTION="Descrição detalhada do seu bot"
BOT_CAPABILITIES="chat,image-generation,text-analysis"
BOT_CONTACT_EMAIL="seu@email.com"
BOT_WEBSITE="https://seu-bot.com"
MAX_TOKENS_PER_REQUEST=1000
```

## Como Usar em Outra Aplicação

```typescript
import { createBotConnection } from 'dengun_ai-admin-client';

// Configuração inicial
const botConfig = {
  baseUrl: 'https://seu-dashboard.com', // URL do seu dashboard
  token: 'seu-token-jwt',              // Token JWT fornecido pelo admin
  userId: 'id-do-usuario',             // ID do usuário autorizado
  tenantId: 'id-do-tenant'             // ID do tenant autorizado
};

// Criar conexão
const botConnection = createBotConnection(botConfig);

// Verificar status da solicitação
const requestStatus = await botConnection.checkRequestStatus();
console.log('Status da solicitação:', requestStatus);

// Se aprovado, você pode usar os outros métodos
if (requestStatus.status === 'approved') {
  // Verificar status da conexão
  const status = await botConnection.ping();
  console.log('Status da conexão:', status);

  // Obter acesso aos bots
  const botAccess = await botConnection.getBotAccess();
  console.log('Bots disponíveis:', botAccess);

  // Obter uso de tokens
  const tokenUsage = await botConnection.getTokenUsage();
  console.log('Uso de tokens:', tokenUsage);
}
```

## Fluxo de Integração
1. Ao instalar o pacote, uma solicitação automática é enviada ao AI Admin Dashboard
2. O super admin do AI Admin Dashboard recebe a solicitação e pode aprovar ou recusar
3. Se recusado, o bot pode tentar novamente até 5 vezes
4. Se aprovado, o bot recebe acesso ao sistema e pode começar a operar
5. O dashboard pode ativar/desativar bots, definir limites e monitorar o uso
6. O pacote renova tokens automaticamente e bloqueia acesso se o admin revogar permissões

## Manutenção e Versionamento

### Atualizar Dependências
```bash
npm install # para instalar dependências
npm update  # para atualizar dependências
```

### Rodar Testes
```bash
npm test
```

### Build do Pacote
```bash
npm run build
```

### Publicar Nova Versão
1. Altere o campo `version` no `package.json` (ex: 1.0.1 → 1.0.2)
2. Rode o build:
   ```bash
   npm run build
   ```
3. Publique:
   ```bash
   npm publish --access public
   ```

### Instalar Versão Específica em Outra App
```bash
npm install dengun_ai-admin-client@1.0.0
```

## Segurança
- Tokens JWT com expiração de 10 minutos
- Renovação automática de tokens
- Validação de permissões por bot
- Controle de acesso por tenant

## Tipos

```typescript
interface BotConfig {
  baseUrl: string;
  token: string;
  userId: string;
  tenantId: string;
}

interface BotAccess {
  botId: string;
  enabled: boolean;
}

interface TokenUsage {
  totalTokens: number;
  lastUsed: Date;
  botId: string;
}

interface BotConnectionStatus {
  isConnected: boolean;
  lastPing?: Date;
  error?: string;
}
```

## Contribuição
- Para contribuir, faça um fork, crie uma branch e envie um pull request.
- Siga o versionamento semântico (semver) para novas versões.

## Licença
ISC
