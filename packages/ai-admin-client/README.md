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
```

### 4. Instalação de Dependências

Instale as dependências necessárias para executar os scripts:

```bash
npm install -D ts-node typescript @types/node dotenv axios
```

### 5. Registro do Bot

Execute o comando de registro para enviar a solicitação ao dashboard:

```bash
# Registrar o bot no dashboard
npx -p dengun_ai-admin-client dengun-ai-register
```

Este comando irá:
- Verificar as configurações no arquivo .env
- Enviar a solicitação de registro ao dashboard
- Salvar o token recebido no arquivo .env
- Mostrar instruções para os próximos passos

### 6. Estrutura Criada

Após a inicialização, você terá a seguinte estrutura:

```
dengun_ai-admin/
├── .env                 # Configurações do bot e tenants
├── config/
│   └── bot.ts          # Configuração da conexão
├── types/
│   └── dengun_ai-admin-client.d.ts  # Declarações de tipos
├── tests/
│   └── connection.test.ts  # Teste de conexão
└── examples/
    └── bot-usage.ts    # Exemplo de uso
```

### 7. Teste de Conexão

Para verificar se a configuração está correta e testar a conexão com o dashboard:

```bash
# 1. Navegue até a pasta do projeto
cd dengun_ai-admin

# 2. Execute o teste de conexão
npx ts-node tests/connection.test.ts
```

O teste irá:
- Verificar as configurações básicas
- Tentar sincronizar os tenants
- Mostrar o status de cada tenant encontrado
- Exibir mensagens de erro detalhadas se algo der errado

### 8. Uso do Cliente

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
      console.log(`\\nVerificando conexão para o tenant ${tenantId}...`);

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

### 9. Solução de Problemas

#### Erros Comuns

1. **Erro de conexão com o dashboard**
   - Verifique se o `DASHBOARD_URL` está correto
   - Confirme se o dashboard está online
   - Verifique se o `BOT_TOKEN` está correto

2. **Erro de configuração do bot**
   - Verifique se todas as variáveis de ambiente estão configuradas
   - Confirme se o arquivo `.env` está na pasta correta
   - Verifique se o bot foi aprovado pelo administrador do dashboard

3. **Erro de importação**
   - Verifique se o caminho de importação está correto
   - Confirme se o TypeScript está configurado corretamente
   - Verifique se todos os arquivos foram criados na pasta `dengun_ai-admin`

### 10. Contribuição
- Para contribuir, faça um fork, crie uma branch e envie um pull request.
- Siga o versionamento semântico (semver) para novas versões.

### 11. Licença
ISC
