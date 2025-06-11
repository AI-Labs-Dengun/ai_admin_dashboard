# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

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