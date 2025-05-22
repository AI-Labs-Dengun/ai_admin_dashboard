# dengun_ai-admin-client

Cliente para integração com o AI Admin Dashboard, permitindo que bots externos se conectem de forma segura ao sistema.

## Instalação

```bash
npm install dengun_ai-admin-client
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

// Verificar status da conexão
const status = await botConnection.ping();
console.log('Status da conexão:', status);

// Obter acesso aos bots
const botAccess = await botConnection.getBotAccess();
console.log('Bots disponíveis:', botAccess);

// Obter uso de tokens
const tokenUsage = await botConnection.getTokenUsage();
console.log('Uso de tokens:', tokenUsage);
```

## Fluxo de Integração
1. O super admin do AI Admin Dashboard cria o usuário e gera o token JWT.
2. O desenvolvedor da app externa recebe o token e configura o pacote conforme o exemplo acima.
3. O dashboard pode ativar/desativar bots, definir limites e monitorar o uso.
4. O pacote renova tokens automaticamente e bloqueia acesso se o admin revogar permissões.

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
