# 📦 Guia de Instalação - AI Admin Client v2.0

## 🎯 Visão Geral

Este guia explica como instalar e configurar o `dengun_ai-admin-client` em sua aplicação externa para conectar ao AI Admin Dashboard. O processo foi projetado para ser **completamente automatizado** com configuração em uma única linha de comando.

## 🚀 Instalação Rápida (1 minuto)

### 1. Instalar o Package
```bash
npm install dengun_ai-admin-client
```

### 2. Configuração e Conexão Automática
```bash
npx ai-admin-init \
  --name "Meu ChatBot" \
  --email "admin@empresa.com" \
  --capabilities "chat,text" \
  --url "http://localhost:3001"
```

### 3. Pronto para Usar!
```bash
cd ai-admin-config
npm install
npm start
```

## 📋 Pré-requisitos

### Sistema
- **Node.js**: Versão 16 ou superior
- **npm/yarn**: Para gerenciamento de dependências
- **TypeScript**: Opcional, mas recomendado

### Dashboard AI Admin
- Dashboard rodando e acessível na URL especificada
- Permissões para solicitar novos bots

## 🔧 Comando de Inicialização

### Sintaxe Completa
```bash
npx ai-admin-init \
  --name "<nome-do-bot>" \
  --email "<seu-email>" \
  --capabilities "<competencias-separadas-por-virgula>" \
  --url "<url-do-seu-bot>" \
  [--dashboard-url "<url-do-dashboard>"]
```

### Parâmetros Obrigatórios

| Parâmetro | Descrição | Exemplo |
|-----------|-----------|---------|
| `--name` | Nome do seu bot | `"Meu ChatBot"` |
| `--email` | Email da sua conta | `"admin@empresa.com"` |
| `--capabilities` | Competências do bot | `"chat,text,image"` |
| `--url` | URL do seu bot/aplicação | `"http://localhost:3001"` |

### Parâmetros Opcionais

| Parâmetro | Descrição | Padrão |
|-----------|-----------|--------|
| `--dashboard-url` | URL do dashboard | `"http://localhost:3000"` |

### Competências Disponíveis

- **`chat`**: Conversação via chat
- **`text`**: Processamento de texto
- **`image`**: Geração/análise de imagens
- **`voice`**: Processamento de voz
- **`code`**: Geração de código
- **`search`**: Busca e pesquisa

## 🎯 Exemplos de Uso

### Bot Básico de Chat
```bash
npx ai-admin-init \
  --name "ChatBot Simples" \
  --email "dev@empresa.com" \
  --capabilities "chat" \
  --url "http://localhost:3001"
```

### Bot Avançado Multi-Modal
```bash
npx ai-admin-init \
  --name "Bot Avançado" \
  --email "admin@empresa.com" \
  --capabilities "chat,text,image,voice" \
  --url "https://meubot.empresa.com"
```

### Bot com Dashboard Customizado
```bash
npx ai-admin-init \
  --name "Bot Empresarial" \
  --email "admin@empresa.com" \
  --capabilities "chat,text,code" \
  --url "https://bot.empresa.com" \
  --dashboard-url "https://dashboard.empresa.com"
```

## 🔄 O que Acontece Automaticamente

### 1. Validação de Parâmetros
- ✅ Verifica email válido
- ✅ Valida URL do bot
- ✅ Confirma competências válidas
- ✅ Testa conectividade com dashboard

### 2. Solicitação de Conexão
- 📤 Envia solicitação para o dashboard
- 🔐 Recebe credenciais (se aprovado automaticamente)
- 📊 Configura sistema de telemetria
- 🐛 Ativa relatórios de erro

### 3. Criação de Arquivos
- 📁 Cria diretório `ai-admin-config/`
- ⚙️ Gera arquivo `.env` com configurações
- 🔒 Cria `.gitignore` para proteção
- 📝 Configura `client.ts` pronto para uso
- 📚 Documenta tudo no `README.md`

### 4. Proteção de Segurança
- 🔐 Credenciais apenas no `.env` (nunca expostas)
- 🚫 `.env` incluído no `.gitignore`
- ✅ Template público `.env.example`
- 🛡️ Validação automática de usuários

## 📊 Status da Aprovação

### Aprovação Automática ✅
```
✅ Bot aprovado automaticamente!
🚀 Seu bot está pronto para uso
```
**Próximos passos**: `cd ai-admin-config && npm install && npm start`

### Pendente de Aprovação ⏳
```
⏳ Bot pendente de aprovação
📧 O administrador foi notificado
```
**Próximos passos**: Aguarde email de aprovação, depois execute `npm start`

### Solicitação Rejeitada ❌
```
❌ Solicitação rejeitada
📧 Entre em contato com o administrador
```
**Próximos passos**: Contate o administrador do dashboard

## 🏗️ Integração Automática por Tipo de Projeto

### Express.js (Detectado Automaticamente)
```typescript
// Já configurado em client.ts
import { withAiAdmin } from './client';

app.post('/api/chat', async (req, res) => {
  await withAiAdmin(async (client) => {
    const session = await client.createUserSession(userId, tenantId);
    // Sua lógica aqui
    await client.reportUsage({...});
    await client.endUserSession(session.sessionId);
  });
});
```

### Next.js (Detectado Automaticamente)
```typescript
// pages/api/chat.js ou app/api/chat/route.ts
import { withAiAdmin } from '../../../ai-admin-config/client';

export async function POST(request) {
  return await withAiAdmin(async (client) => {
    const session = await client.createUserSession(userId, tenantId);
    // Sua lógica aqui
    return NextResponse.json({...});
  });
}
```

### Standalone/Outros
```typescript
// Qualquer aplicação
import { initializeAiAdmin, aiAdminClient } from './ai-admin-config/client';

async function main() {
  await initializeAiAdmin();
  // Sua lógica aqui
}
```

## 🔒 Segurança Garantida

### Proteção de Credenciais
- ✅ **`.env`** nunca é commitado (`.gitignore` automático)
- ✅ **Credenciais** apenas em variáveis de ambiente
- ✅ **Templates públicos** sem dados sensíveis
- ✅ **Validação** de usuários no dashboard

### Comunicação Segura
- 🔐 **HTTPS** quando disponível
- 🔑 **Autenticação** via botId/botSecret
- 📊 **Telemetria** criptografada
- 🐛 **Relatórios** sem dados sensíveis

## 🔍 Verificar Status da Configuração

### Comando de Verificação
```bash
cd ai-admin-config
npm run check-status
```

### Status Possíveis
- **`approved`**: ✅ Pronto para uso
- **`pending`**: ⏳ Aguardando aprovação
- **`rejected`**: ❌ Rejeitado pelo administrador
- **`error`**: 🔧 Erro na configuração

## 🛠️ Reconfiguração

### Alterar Configurações
Para alterar qualquer configuração, execute novamente:
```bash
npx ai-admin-init \
  --name "Novo Nome" \
  --email "novo@email.com" \
  --capabilities "novas,competencias" \
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

## 🆘 Solução de Problemas

### Erro: Dashboard não acessível
```
❌ Dashboard não acessível em http://localhost:3000
```
**Solução**: 
1. Verifique se o dashboard está rodando
2. Confirme a URL com `--dashboard-url`
3. Teste conectividade: `curl http://localhost:3000/api/health`

### Erro: Email inválido
```
❌ Email inválido
```
**Solução**: Use um email válido como `admin@empresa.com`

### Erro: Competências inválidas
```
❌ Competências inválidas: xyz, abc
```
**Solução**: Use apenas competências válidas: `chat,text,image,voice,code,search`

### Bot pendente há muito tempo
```
⏳ Bot pendente de aprovação
```
**Solução**:
1. Verifique o email do administrador
2. Contate o administrador do dashboard
3. Verifique logs do dashboard

### Erro: URL do bot inválida
```
❌ URL do bot inválida
```
**Solução**: Use URL completa como `http://localhost:3001` ou `https://bot.empresa.com`

## 📚 Próximos Passos Após Instalação

### 1. Desenvolvimento
```bash
cd ai-admin-config
npm install
npm run dev  # Modo desenvolvimento
```

### 2. Personalização
Edite os arquivos em `ai-admin-config/` para implementar sua lógica específica:
- `client.ts` - Configurações do cliente
- Adicione seus endpoints de API
- Implemente processamento de mensagens

### 3. Produção
```bash
npm run build
npm start
```

### 4. Monitoramento
Acesse o dashboard em `DASHBOARD_URL` para:
- 📊 Ver estatísticas de uso
- 👥 Gerenciar usuários
- 🐛 Monitorar erros
- ⚙️ Ajustar configurações

## 💡 Dicas Importantes

### ✅ Faça
- ✅ Use nomes descritivos para seus bots
- ✅ Mantenha o `.env` privado sempre
- ✅ Teste a integração após configurar
- ✅ Monitore o uso no dashboard
- ✅ Configure competências adequadas

### ❌ Não Faça
- ❌ Commite arquivos `.env`
- ❌ Exponha credenciais no código
- ❌ Use URLs inválidas
- ❌ Ignore erros de aprovação
- ❌ Configure competências desnecessárias

---

**🎉 Com este workflow, sua aplicação está pronta para conectar ao AI Admin Dashboard em menos de 1 minuto!**

**🔒 Lembre-se**: Toda a comunicação é gerenciada pelo package - você só precisa focar na lógica do seu bot! 