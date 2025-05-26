# dengun_ai-admin-client

Cliente para integração com o AI Admin Dashboard, permitindo que bots externos se conectem de forma segura ao sistema.

## Guia de Instalação Passo a Passo

### 1. Instalação do Pacote

```bash
# Instalar o pacote
npm install dengun_ai-admin-client
```

### 2. Inicialização do Cliente

Após a instalação, execute o comando de inicialização para criar a estrutura necessária:

```bash
# Executar o script de inicialização
npx -p dengun_ai-admin-client dengun-ai-init
```

Este comando irá:
- Criar a pasta `dengun_ai-admin`
- Criar os arquivos de configuração necessários
- Configurar a estrutura básica do projeto

### 3. Configuração do Bot

Edite o arquivo `.env` na pasta `dengun_ai-admin` com as configurações do seu bot:

```env
# Configurações do Bot
BOT_NAME="Nome do seu bot"
BOT_DESCRIPTION="Descrição detalhada do seu bot"
BOT_CAPABILITIES="chat,image-generation,text-analysis"
BOT_CONTACT_EMAIL="seu@email.com"
BOT_WEBSITE="https://seu-bot.com"
MAX_TOKENS_PER_REQUEST=1000

# Configurações do Dashboard
DASHBOARD_URL="https://seu-dashboard.com"

# Configurações dos Tenants
# Formato: TENANT_[ID]_TOKEN="seu-token-jwt"
# Exemplo: TENANT_123_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
TENANT_123_TOKEN="seu-token-jwt"
TENANT_123_USER_ID="id-do-usuario"
TENANT_123_MAX_TOKENS=1000
TENANT_123_MAX_REQUESTS=1000

# Você pode adicionar mais tenants seguindo o mesmo padrão
TENANT_456_TOKEN="outro-token-jwt"
TENANT_456_USER_ID="outro-usuario"
TENANT_456_MAX_TOKENS=2000
TENANT_456_MAX_REQUESTS=2000
```

### 4. Estrutura Criada

Após a inicialização, você terá a seguinte estrutura:

```
dengun_ai-admin/
├── .env                 # Configurações do bot e tenants
├── config/
│   └── bot.ts          # Configuração da conexão
└── examples/
    └── bot-usage.ts    # Exemplo de uso
```

### 5. Uso do Cliente

1. Importe o `botConnection` em seu código:

```typescript
import { botConnection, getTenantConnection } from './dengun_ai-admin/config/bot';
```

2. Use o `botConnection` para interagir com todos os tenants:

```typescript
async function main() {
  try {
    // Exemplo de uso com múltiplos tenants
    for (const [tenantId, connection] of Object.entries(botConnection)) {
      console.log(`\nVerificando conexão para o tenant ${tenantId}...`);

      // Verificar status da solicitação
      const requestStatus = await connection.checkRequestStatus();
      console.log('Status da solicitação:', requestStatus);

      // Se aprovado, você pode usar os outros métodos
      if (requestStatus.status === 'approved') {
        // Verificar status da conexão
        const status = await connection.ping();
        console.log('Status da conexão:', status);

        // Obter acesso aos bots
        const botAccess = await connection.getBotAccess();
        console.log('Bots disponíveis:', botAccess);

        // Obter uso de tokens
        const tokenUsage = await connection.getTokenUsage();
        console.log('Uso de tokens:', tokenUsage);
      }
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}
```

3. Ou use um tenant específico:

```typescript
const specificTenantId = '123';
const specificConnection = getTenantConnection(specificTenantId);
if (specificConnection) {
  const status = await specificConnection.ping();
  console.log('Status da conexão:', status);
}
```

### 6. Configuração do TypeScript (se necessário)

Se você estiver usando TypeScript, adicione o seguinte ao seu `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "dengun_ai-admin/*": ["./dengun_ai-admin/*"]
    }
  }
}
```

## Solução de Problemas

### Erros Comuns

1. **Erro de conexão com o dashboard**
   - Verifique se o `DASHBOARD_URL` está correto
   - Confirme se o dashboard está online
   - Verifique se as credenciais dos tenants são válidas

2. **Erro de configuração do bot**
   - Verifique se todas as variáveis de ambiente estão configuradas
   - Confirme se o arquivo `.env` está na pasta correta
   - Verifique se o bot foi aprovado pelo administrador do dashboard

3. **Erro de importação**
   - Verifique se o caminho de importação está correto
   - Confirme se o TypeScript está configurado corretamente
   - Verifique se todos os arquivos foram criados na pasta `dengun_ai-admin`

## Fluxo de Integração
1. Ao instalar o pacote, uma solicitação automática é enviada ao AI Admin Dashboard
2. O super admin do AI Admin Dashboard recebe a solicitação e pode aprovar ou recusar
3. Se recusado, o bot pode tentar novamente até 5 vezes
4. Se aprovado, o bot recebe acesso ao sistema e pode começar a operar
5. O dashboard pode ativar/desativar bots, definir limites e monitorar o uso
6. O pacote renova tokens automaticamente e bloqueia acesso se o admin revogar permissões

## Segurança
- Tokens JWT com expiração de 10 minutos
- Renovação automática de tokens
- Validação de permissões por bot
- Controle de acesso por tenant

## Tipos

```typescript
interface BotConfig {
  baseUrl: string;
  botName: string;
  botDescription: string;
  botCapabilities: string[];
  contactEmail: string;
  website?: string;
  maxTokensPerRequest: number;
}

interface TenantConfig {
  token: string;
  userId: string;
  limits: {
    maxTokensPerRequest: number;
    maxRequestsPerDay: number;
  };
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
