# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

## [2.1.0] - 2024-01-XX

### 🚀 WORKFLOW COMPLETAMENTE AUTOMATIZADO

Esta versão implementa o workflow ideal solicitado: **configuração em uma única linha de comando**!

### ✨ Novos Recursos

#### Comando de Inicialização Automatizada
- **npx ai-admin-init**: Setup completo com parâmetros na linha de comando
- **Solicitação automática**: Conecta automaticamente ao dashboard
- **Configuração instantânea**: Tudo configurado em menos de 1 minuto
- **Proteção total**: Arquivos .env nunca expostos

#### Parâmetros Simples e Diretos
```bash
npx ai-admin-init \
  --name "Meu Bot" \
  --email "admin@empresa.com" \
  --capabilities "chat,text,image" \
  --url "http://localhost:3001"
```

#### Segurança Garantida
- 🔒 **Credenciais protegidas**: .env nunca commitado
- 🚫 **GitIgnore automático**: Proteção de arquivos sensíveis
- ✅ **Templates públicos**: .env.example sem dados sensíveis
- 🛡️ **Comunicação segura**: Todo tráfego pelo package

### 🔄 Processo Automatizado

#### 1. Validação Inteligente
- ✅ Valida email, URLs e competências
- ✅ Testa conectividade com dashboard
- ✅ Verifica parâmetros obrigatórios
- ✅ Detecta tipo de projeto automaticamente

#### 2. Solicitação de Conexão
- 📤 Envia solicitação ao dashboard automaticamente
- 🔐 Recebe credenciais se aprovado instantaneamente
- ⏳ Aguarda aprovação se necessário
- 📧 Notifica resultado via console e email

#### 3. Configuração Completa
- 📁 Cria diretório ai-admin-config/
- ⚙️ Gera .env com todas as configurações
- 🔒 Configura .gitignore para proteção
- 📝 Cliente TypeScript pronto para uso
- 📚 Documentação completa e específica

### 🎯 Competências Suportadas

- **chat**: Conversação via chat
- **text**: Processamento de texto  
- **image**: Geração/análise de imagens
- **voice**: Processamento de voz
- **code**: Geração de código
- **search**: Busca e pesquisa

### 📊 Status de Aprovação

#### Automática ✅
```
✅ Bot aprovado automaticamente!
🚀 Pronto para uso: cd ai-admin-config && npm start
```

#### Pendente ⏳
```
⏳ Aguardando aprovação do administrador
📧 Você receberá email quando aprovado
```

#### Rejeitada ❌
```
❌ Solicitação rejeitada
📧 Contate o administrador do dashboard
```

### 🏗️ Integração Automática

#### Express.js (Detectado)
```typescript
import { withAiAdmin } from './ai-admin-config/client';

app.post('/api/chat', async (req, res) => {
  await withAiAdmin(async (client) => {
    // Sua lógica aqui - tudo configurado!
  });
});
```

#### Next.js (Detectado)
```typescript
import { withAiAdmin } from '../../../ai-admin-config/client';

export async function POST(request) {
  return await withAiAdmin(async (client) => {
    // API Route pronta para uso!
  });
}
```

### 🔧 Comandos Úteis

```bash
# Verificar status
cd ai-admin-config && npm run check-status

# Reconfigurar
npx ai-admin-init --name "Novo Nome" --email "novo@email.com" --capabilities "chat,text" --url "http://nova-url.com"

# Trocar dashboard
npx ai-admin-init --dashboard-url "https://novo-dashboard.com" [outros-params]
```

### 🗑️ Removido

#### Scripts Separados
- `request.ts` - Integrado no init.ts
- Configuração manual complexa
- Múltiplos passos de setup
- Exposição acidental de credenciais

### 🔄 Mudanças Significativas

#### ANTES (v2.0)
```bash
# 1. Instalar
npm install dengun_ai-admin-client

# 2. Configurar manualmente
npx ai-admin-init

# 3. Editar .env
nano ai-admin-config/.env

# 4. Solicitar conexão
npx ai-admin-request --name "Bot" --email "email"

# 5. Aguardar aprovação
# 6. Configurar credenciais
# 7. Instalar dependências
# 8. Executar
```

#### AGORA (v2.1)
```bash
# 1. Instalar e configurar tudo
npm install dengun_ai-admin-client
npx ai-admin-init --name "Bot" --email "email" --capabilities "chat" --url "http://localhost:3001"

# 2. Usar imediatamente
cd ai-admin-config && npm install && npm start
```

### 📚 Documentação Atualizada

#### Novo Guia de Instalação
- Workflow simplificado de 1 minuto
- Exemplos práticos por tipo de projeto
- Troubleshooting específico
- Dicas de segurança

#### Templates Automáticos
- README específico para cada projeto
- Client.ts configurado e pronto
- Package.json com scripts úteis
- Proteção automática de arquivos sensíveis

### 🛠️ Melhorias Técnicas

#### Validação Robusta
- Email, URL e competências validados
- Conectividade testada antes da solicitação
- Feedback claro sobre erros

#### Detecção de Projeto
- Express.js detectado automaticamente
- Next.js identificado e configurado
- Standalone para outros casos

#### Proteção de Segurança
- .gitignore criado automaticamente
- .env nunca exposto ou commitado
- Templates públicos sem dados sensíveis
- Toda comunicação pelo package

### 🎯 Objetivo Alcançado

**✅ Workflow Ideal Implementado:**

1. **Cliente instala** → `npm install dengun_ai-admin-client`
2. **Executa comando único** → `npx ai-admin-init --name "Bot" --email "email" --capabilities "chat" --url "url"`
3. **Tudo configurado automaticamente** → Credenciais, .env, proteção, documentação
4. **Pronto para usar** → `cd ai-admin-config && npm start`

**🔒 Segurança Garantida:**
- Arquivos .env nunca revelados (gitignore automático)
- Toda comunicação pelo package
- Credenciais protegidas em variáveis de ambiente
- Templates públicos sem dados sensíveis

---

## [2.0.0] - 2024-01-XX

### 🎯 REFATORAÇÃO COMPLETA - FOCO NOS 4 OBJETIVOS PRINCIPAIS

Esta versão representa uma refatoração completa do package, tornando-o mais simples, genérico e focado nos 4 objetivos principais:

1. **🔗 Conexão**: Garantir conexão entre apps
2. **👥 Múltiplos usuários**: Suporte a usuários simultâneos  
3. **📊 Telemetria**: Relatório automático de uso
4. **🐛 Relatórios**: Relatório automático de erros

### ✨ Novidades

#### Nova API Principal
- **AiAdminClient**: Classe principal unificada e simplificada
- **Configuração mínima**: Apenas 3 parâmetros obrigatórios
- **Plug and Play**: Funciona imediatamente após instalação
- **TypeScript nativo**: Tipos completos e seguros

#### Objetivos Implementados
1. **ConnectionManager**: Gerencia conexão automática com o dashboard
   - Autenticação automática
   - Reconexão em falhas
   - Ping periódico
   - Interceptadores HTTP

2. **Gestão de Sessões**: Suporte a múltiplos usuários
   - Sessões isoladas por usuário
   - Validação de permissões
   - Metadata customizável
   - Gestão automática de estado

3. **TelemetryReporter**: Relatório automático de uso
   - Fila inteligente de dados
   - Envio em lotes otimizado
   - Estatísticas locais e remotas
   - Configuração de intervalos

4. **ErrorReporter**: Relatório automático de erros
   - Captura global de erros
   - Categorização por gravidade
   - Context automático
   - Fila resiliente

#### Facilidades de Uso
- **Script de inicialização**: `npx ai-admin-init`
- **Configuração automática**: Templates prontos
- **Exemplos práticos**: Casos de uso reais
- **Documentação completa**: README atualizado

### 🔄 Mudanças Significativas

#### API Simplificada
```typescript
// ANTES (v1.x)
import { BotConnection, TokenManager } from 'dengun_ai-admin-client';
const connection = new BotConnection(config);
await connection.connect();

// AGORA (v2.0)
import { AiAdminClient } from 'dengun_ai-admin-client';
const client = new AiAdminClient(config);
await client.initialize();
```

#### Configuração Simplificada
```typescript
// ANTES - configuração complexa
const config = {
  baseUrl: '...',
  apiUrl: '...',
  botId: '...',
  token: '...',
  userId: '...',
  tenantId: '...'
};

// AGORA - apenas 3 parâmetros
const config = {
  dashboardUrl: 'http://localhost:3000',
  botId: 'meu-bot',
  botSecret: 'meu-secret'
};
```

### 🗑️ Removido

#### APIs Descontinuadas
- `BotConnection` - Substituído por `AiAdminClient`
- `TokenManager` - Integrado no `ConnectionManager`
- `TelemetryService` - Substituído por `TelemetryReporter`
- `PublicKeyManager` - Não necessário na nova arquitetura
- `TokenValidator` - Simplificado no `ConnectionManager`

#### Arquivos Removidos
- `src/config.ts` - Substituído pelos tipos em `src/types/`
- `src/http/BotHttpClient.ts` - Integrado no `ConnectionManager`
- Scripts de registro complexos - Substituídos pelo `ai-admin-init`

### 🔧 Melhorias Técnicas

#### Arquitetura
- **EventEmitter**: Sistema de eventos para monitoramento
- **Gestão de Estado**: Sessões e conexões centralizadas
- **Resilência**: Filas com retry automático
- **Performance**: Envio em lotes e cache local

#### Desenvolvimento
- **Testes**: Cobertura atualizada para nova API
- **Build**: Processo simplificado
- **Linting**: Regras atualizadas
- **TypeScript**: Strict mode habilitado

### 📦 Instalação e Migração

#### Nova Instalação
```bash
npm install dengun_ai-admin-client
npx ai-admin-init
```

#### Migração de v1.x
A migração requer refatoração do código existente devido às mudanças significativas na API. Consulte os exemplos na documentação.

### 🛠️ Configurações

#### Novas Opções
```typescript
{
  autoReportUsage: true,     // Relatório automático de uso
  autoReportErrors: true,    // Relatório automático de erros
  reportInterval: 30000,     // Intervalo de envio (ms)
  timeout: 10000,            // Timeout de conexão
  debug: false               // Logs de debug
}
```

### 📚 Documentação

- README completamente reescrito
- Exemplos práticos adicionados
- Guia de integração com frameworks
- Documentação da API atualizada

### 🎯 Próximos Passos

- Monitoramento de uso em produção
- Otimizações baseadas em feedback
- Expansão de exemplos de integração
- Métricas avançadas de performance

---

## [1.6.13] - Versão Anterior

### Arquitetura Legada
- Sistema baseado em múltiplas classes
- Configuração complexa
- Gerenciamento manual de conexões
- APIs fragmentadas

**Nota**: Esta versão marca uma quebra significativa de compatibilidade. A v2.0 é um redesign completo focado em simplicidade e eficiência. 