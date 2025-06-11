# 🤖 AI Admin Client v2.1 - Conexão Automatizada

Cliente oficial para conectar aplicações externas ao **AI Admin Dashboard** com configuração automática em uma única linha de comando.

## 🚀 Instalação e Configuração Instantânea

### 1. Instalar o Package
```bash
npm install dengun_ai-admin-client
```

### 2. Configurar Automaticamente
```bash
npx ai-admin-init \
  --name "Meu ChatBot" \
  --email "admin@empresa.com" \
  --capabilities "chat,text,image" \
  --url "http://localhost:3001"
```

### 3. Usar Imediatamente
```bash
cd ai-admin-config
npm install
npm start
```

**🎉 Pronto! Sua aplicação está conectada ao AI Admin Dashboard!**

## 🎯 Recursos Principais

### ✅ 4 Objetivos Cumpridos
1. **🔗 Conexão**: Autenticação e comunicação automática
2. **👥 Múltiplos usuários**: Sessões isoladas por usuário/tenant
3. **📊 Telemetria**: Relatórios automáticos de uso de tokens
4. **🐛 Relatórios**: Captura e envio automático de erros

### ✅ Segurança Garantida
- 🔒 **Credenciais protegidas**: `.env` nunca commitado
- 🚫 **GitIgnore automático**: Arquivos sensíveis protegidos
- ✅ **Templates públicos**: Sem dados sensíveis
- 🛡️ **Comunicação segura**: Todo tráfego pelo package

### ✅ Configuração Zero
- ⚡ **Setup em 1 minuto**: Uma linha de comando configura tudo
- 🔧 **Detecção automática**: Express.js, Next.js ou standalone
- 📝 **Cliente pronto**: TypeScript configurado e documentado
- 📚 **Documentação específica**: README personalizado

## 🎯 Competências Disponíveis

Configure as capacidades do seu bot:

- **`chat`**: Conversação via chat
- **`text`**: Processamento de texto
- **`image`**: Geração/análise de imagens  
- **`voice`**: Processamento de voz
- **`code`**: Geração de código
- **`search`**: Busca e pesquisa

## 📋 Parâmetros do Comando

### Obrigatórios
| Parâmetro | Descrição | Exemplo |
|-----------|-----------|---------|
| `--name` | Nome do seu bot | `"Meu ChatBot"` |
| `--email` | Email da sua conta | `"admin@empresa.com"` |
| `--capabilities` | Competências do bot | `"chat,text,image"` |
| `--url` | URL do seu bot | `"http://localhost:3001"` |

### Opcionais
| Parâmetro | Descrição | Padrão |
|-----------|-----------|--------|
| `--dashboard-url` | URL do dashboard | `"http://localhost:3000"` |

## 🏗️ Exemplos de Integração

### Express.js (Detectado Automaticamente)
```typescript
import { withAiAdmin } from './ai-admin-config/client';

app.post('/api/chat', async (req, res) => {
  const { message, userId, tenantId } = req.body;
  
  await withAiAdmin(async (client) => {
    // 1. Criar sessão
    const session = await client.createUserSession(userId, tenantId);
    
    try {
      // 2. Processar mensagem (SUA LÓGICA AQUI)
      const response = await processMessage(message);
      
      // 3. Reportar uso automaticamente
      await client.reportUsage({
        sessionId: session.sessionId,
        userId,
        tenantId,
        action: 'chat_message',
        tokensUsed: response.tokensUsed
      });
      
      res.json({ response: response.text });
    } finally {
      // 4. Encerrar sessão
      await client.endUserSession(session.sessionId);
    }
  });
});
```

### Next.js (Detectado Automaticamente)
```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAiAdmin } from '../../../ai-admin-config/client';

export async function POST(request: NextRequest) {
  const { message, userId, tenantId } = await request.json();
  
  return await withAiAdmin(async (client) => {
    const session = await client.createUserSession(userId, tenantId);
    
    try {
      // SUA LÓGICA DE IA AQUI
      const response = await processMessage(message);
      
      await client.reportUsage({
        sessionId: session.sessionId,
        userId,
        tenantId,
        action: 'chat_message',
        tokensUsed: response.tokensUsed
      });
      
      return NextResponse.json({ response: response.text });
    } finally {
      await client.endUserSession(session.sessionId);
    }
  });
}
```

### Aplicação Standalone
```typescript
import { initializeAiAdmin, aiAdminClient } from './ai-admin-config/client';

async function main() {
  // Inicializar conexão
  await initializeAiAdmin();
  
  // Usar o cliente
  const session = await aiAdminClient.createUserSession('user123', 'tenant456');
  
  // Sua lógica aqui...
  
  await aiAdminClient.endUserSession(session.sessionId);
}
```

## 📊 Status da Aprovação

### ✅ Aprovado Automaticamente
```
✅ Bot aprovado automaticamente!
🚀 Seu bot está pronto para uso
```
**Próximos passos**: `cd ai-admin-config && npm install && npm start`

### ⏳ Pendente de Aprovação
```
⏳ Bot pendente de aprovação
📧 O administrador foi notificado
```
**Próximos passos**: Aguarde email de aprovação, depois execute `npm start`

### ❌ Solicitação Rejeitada
```
❌ Solicitação rejeitada
📧 Entre em contato com o administrador
```
**Próximos passos**: Contate o administrador do dashboard

## 🔧 Comandos Úteis

### Verificar Status
```bash
cd ai-admin-config
npm run check-status
```

### Reconfigurar Bot
```bash
npx ai-admin-init \
  --name "Novo Nome" \
  --email "novo@email.com" \
  --capabilities "chat,text" \
  --url "http://nova-url.com"
```

### Trocar Dashboard
```bash
npx ai-admin-init \
  --name "Meu Bot" \
  --email "admin@empresa.com" \
  --capabilities "chat,text" \
  --url "http://localhost:3001" \
  --dashboard-url "https://novo-dashboard.com"
```

## 🔒 Segurança

### Proteção Automática
- ✅ `.env` incluído no `.gitignore` automaticamente
- ✅ Credenciais apenas em variáveis de ambiente
- ✅ Templates públicos sem dados sensíveis
- ✅ Comunicação HTTPS quando disponível

### Validação de Usuários
```typescript
// O package valida automaticamente no dashboard
try {
  const session = await client.createUserSession(userId, tenantId);
  // Usuário válido com tokens disponíveis
} catch (error) {
  // Usuário sem acesso ou tokens insuficientes
  console.error('Acesso negado:', error.message);
}
```

## 🆘 Solução de Problemas

### Dashboard não acessível
```bash
# Verificar se está rodando
curl http://localhost:3000/api/health

# Usar URL customizada
npx ai-admin-init --dashboard-url "https://dashboard.empresa.com" [outros-params]
```

### Email ou URL inválidos
```bash
# Use formato correto
--email "admin@empresa.com"
--url "http://localhost:3001"
```

### Competências inválidas
```bash
# Use apenas: chat,text,image,voice,code,search
--capabilities "chat,text,image"
```

### Bot pendente há muito tempo
1. Verifique logs do dashboard
2. Contate o administrador
3. Reenvie solicitação se necessário

## 📚 Documentação Completa

- **[INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)** - Guia detalhado de instalação
- **[CHANGELOG.md](CHANGELOG.md)** - Histórico de mudanças
- **ai-admin-config/README.md** - Documentação específica do seu projeto

## 🎯 Exemplos Práticos

### Bot de Chat Simples
```bash
npx ai-admin-init \
  --name "ChatBot Simples" \
  --email "dev@empresa.com" \
  --capabilities "chat" \
  --url "http://localhost:3001"
```

### Bot Multi-Modal Avançado
```bash
npx ai-admin-init \
  --name "Bot Avançado" \
  --email "admin@empresa.com" \
  --capabilities "chat,text,image,voice" \
  --url "https://bot.empresa.com"
```

### Bot de Programação
```bash
npx ai-admin-init \
  --name "CodeBot" \
  --email "dev@empresa.com" \
  --capabilities "code,text,search" \
  --url "http://localhost:3001"
```

## 💡 Dicas Importantes

### ✅ Faça
- ✅ Use nomes descritivos para o bot
- ✅ Configure apenas competências necessárias
- ✅ Teste a integração após configurar
- ✅ Monitore uso no dashboard
- ✅ Mantenha credenciais seguras

### ❌ Não Faça
- ❌ Commite arquivos `.env`
- ❌ Exponha credenciais no código
- ❌ Use URLs ou emails inválidos
- ❌ Configure competências desnecessárias
- ❌ Ignore erros de aprovação

## 🚀 Próximos Passos

1. **Configure seu bot**: Execute `npx ai-admin-init` com seus parâmetros
2. **Implemente sua lógica**: Edite os arquivos em `ai-admin-config/`
3. **Teste localmente**: `npm run dev`
4. **Monitore no dashboard**: Acesse a URL do dashboard
5. **Deloye em produção**: `npm run build && npm start`

---

**🎉 Com o AI Admin Client v2.1, conectar ao dashboard é simples, seguro e automático!**

**🔒 Lembre-se**: Toda a comunicação é gerenciada pelo package - você só precisa focar na lógica do seu bot!
