# REFATORAÇÃO DO SCHEMA - AI ADMIN DASHBOARD

## 🎯 Objetivos Alcançados

✅ **Convenção de Nomenclatura Implementada**
- Tabelas restritas aos super_admin começam com `super_`
- Tabelas restritas aos clientes/admins começam com `client_`
- Tabela compartilhada mantém nome simples (`profiles`)

✅ **Tabelas Desnecessárias Removidas**
- `bot_webhooks` - consolidado em `client_bot_status.metadata`
- `bot_errors` - consolidado em `client_bot_status` (campos de erro)
- `bot_messages` - removido (não estava sendo usado efetivamente)
- `bot_notifications` - removido (duplicava `super_bot_requests`)

✅ **Políticas de Segurança Mantidas**
- Super admins têm acesso total a todas as tabelas
- Admins só acessam dados dos seus tenants
- RLS aplicado em todas as tabelas

## 📊 Estrutura Reorganizada

### TABELAS SUPER_ADMIN (Prefixo `super_`)
Gerenciadas **APENAS** por super_admin:

#### `super_tenants`
- Era: `tenants`
- Propósito: Organizações/inquilinos do sistema
- Acesso: Apenas super_admin

#### `super_tenant_users`
- Era: `tenant_users`
- Propósito: Relacionamento usuário-tenant
- Acesso: Apenas super_admin

#### `super_bots`
- Era: `bots`
- Propósito: Catálogo de bots disponíveis
- Acesso: Apenas super_admin
- Melhorias: Campo `is_active` para controle

#### `super_tenant_bots`
- Era: `tenant_bots`
- Propósito: Quais bots estão disponíveis para cada tenant
- Acesso: Apenas super_admin

#### `super_bot_requests`
- Era: `bot_requests`
- Propósito: Solicitações de novos bots
- Acesso: Apenas super_admin
- Melhorias: Campo `admin_notes` para observações

### TABELAS CLIENT (Prefixo `client_`)
Usadas por admins e super_admin:

#### `client_user_bots`
- Era: `user_bots`
- Propósito: Quais bots cada usuário pode usar
- Acesso: Admins (seus tenants) + super_admin

#### `client_token_usage`
- Era: `token_usage`
- Propósito: Registro de uso de tokens
- Acesso: Admins (seus tenants) + super_admin + bots (inserção)

#### `client_bot_status`
- Era: `bot_status` + `bot_errors` + `bot_webhooks`
- Propósito: Status consolidado dos bots
- Acesso: Admins (seus tenants) + super_admin
- Melhorias: Consolida erros e metadados em uma tabela

### TABELA COMPARTILHADA

#### `profiles`
- Mantém o nome original
- Propósito: Perfis de usuários
- Acesso: Usuários (próprio perfil) + super_admin

## 🔒 Políticas de Segurança (RLS)

### Super Admin
- Acesso **TOTAL** a todas as tabelas
- Pode criar, ler, atualizar e deletar qualquer registro

### Admins
- Acesso **RESTRITO** aos dados dos seus tenants
- Podem gerenciar `client_*` apenas para seus tenants
- Não podem acessar tabelas `super_*`

### Bots
- Podem **INSERIR** registros em `client_token_usage`
- Autenticação via `bot_secret` no header

## 🚀 Melhorias Implementadas

### 1. **Consolidação de Tabelas**
```sql
-- ANTES: 3 tabelas separadas
bot_status + bot_errors + bot_webhooks

-- DEPOIS: 1 tabela consolidada
client_bot_status {
    status,
    error_count,
    last_error_message,
    last_error_at,
    metadata (JSONB para dados flexíveis)
}
```

### 2. **Campos de Controle Adicionados**
- `is_active` em várias tabelas para soft delete
- `admin_notes` em `super_bot_requests`
- `metadata` JSONB em `client_bot_status`

### 3. **Triggers Otimizados**
- `updated_at` automático em todas as tabelas
- Propagação de mudanças entre tabelas relacionadas
- Geração automática de `bot_secret`

### 4. **Índices Estratégicos**
- Performance otimizada para consultas comuns
- Índices compostos para queries complexas
- Índices em campos de filtro frequentes

### 5. **Views Analíticas**
- `token_usage_analytics` - análise de uso por período
- `user_roles_summary` - resumo de roles dos usuários
- `user_bots_details` - detalhes completos das associações

## 📈 Facilidade de Manutenção

### ✅ Vantagens da Nova Estrutura

1. **Separação Clara de Responsabilidades**
   - `super_*` = Gerenciamento do sistema
   - `client_*` = Operações dos clientes
   - `profiles` = Dados compartilhados

2. **Redução de Complexidade**
   - Menos tabelas para manter
   - Relacionamentos mais claros
   - Consolidação de funcionalidades similares

3. **Facilidade de Backup/Restore**
   - Dados de super_admin separados
   - Dados de clientes isolados por categoria

4. **Debugging Simplificado**
   - Nomenclatura intuitiva
   - Estrutura previsível
   - Logs organizados por categoria

### 🔧 Comandos de Migração

```bash
# Para aplicar o novo schema
psql -d sua_database -f schema-supabase-refactored.sql

# Para comparar com o schema antigo
diff schema-supabase.sql schema-supabase-refactored.sql
```

## 📋 Tabelas Removidas e Justificativas

| Tabela Removida | Justificativa | Substituição |
|-----------------|---------------|--------------|
| `bot_webhooks` | Pouco uso, dados simples | `client_bot_status.metadata` |
| `bot_errors` | Redundante com bot_status | `client_bot_status.error_*` |
| `bot_messages` | Não integrada ao sistema | Removida |
| `bot_notifications` | Duplicava bot_requests | `super_bot_requests` |

## 🎉 Resultado Final

- **De 12 tabelas para 8 tabelas** (-33% de complexidade)
- **Nomenclatura consistente e intuitiva**
- **Separação clara de responsabilidades**
- **Manutenção simplificada**
- **Performance otimizada**
- **Segurança mantida e melhorada** 