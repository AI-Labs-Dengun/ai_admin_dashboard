# 🚀 Guia de Instalação - Next.js Integration

## 📋 Visão Geral

Guia completo para integrar o `dengun_ai-admin-client` em aplicações Next.js. Este processo automatiza completamente a configuração e conexão com o AI Admin Dashboard.

## 🚀 Instalação Automática (2 comandos)

### 1. Instalar e Configurar
```bash
# Instalar o package
npm install dengun_ai-admin-client

# Inicializar setup completo para Next.js
npx ai-admin-init --nextjs
```

### 2. Solicitar Conexão com Dashboard
```bash
# Enviar solicitação de registro ao dashboard
npx ai-admin-request --name "Meu Bot" --email "seu@email.com" --website "http://localhost:3000"
```

## 📁 Estrutura Criada Automaticamente

Após executar `npx ai-admin-init --nextjs`, será criada a seguinte estrutura:

```
sua-app-nextjs/
├── .env                          # Configurações de ambiente
├── .env.example                  # Template de configurações
├── lib/
│   └── ai-admin-client.ts       # Cliente singleton configurado
├── app/api/
│   ├── ai-admin/
│   │   ├── webhook/route.ts     # Recebe dados do dashboard
│   │   ├── auth/route.ts        # Endpoint de autenticação
│   │   └── status/route.ts      # Status da aplicação
│   └── chat/route.ts            # Exemplo de endpoint de chat
├── components/
│   └── ai-admin-status.tsx      # Componente de status
├── types/
│   └── ai-admin.ts              # Tipos TypeScript
└── README-INTEGRATION.md        # Documentação da integração
```

## ⚙️ Configuração Automática

### Arquivo .env (Criado Automaticamente)
```env
# === AI ADMIN DASHBOARD INTEGRATION ===
DASHBOARD_URL=http://localhost:3000
BOT_ID=seu-bot-id
BOT_SECRET=seu-bot-secret

# Configurações Opcionais
AUTO_REPORT_USAGE=true
AUTO_REPORT_ERRORS=true
REPORT_INTERVAL=30000
DEBUG=false

# Next.js específico
NEXTAUTH_SECRET=your-nextauth-secret
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Cliente Singleton (lib/ai-admin-client.ts)
```typescript
import { AiAdminClient } from 'dengun_ai-admin-client';

let client: AiAdminClient | null = null;
let isInitialized = false;

export async function getAiAdminClient(): Promise<AiAdminClient> {
  if (!client) {
    client = new AiAdminClient({
      dashboardUrl: process.env.DASHBOARD_URL!,
      botId: process.env.BOT_ID!,
      botSecret: process.env.BOT_SECRET!,
      options: {
        autoReportUsage: process.env.AUTO_REPORT_USAGE === 'true',
        autoReportErrors: process.env.AUTO_REPORT_ERRORS === 'true',
        reportInterval: parseInt(process.env.REPORT_INTERVAL || '30000'),
        debug: process.env.DEBUG === 'true'
      }
    });
  }

  if (!isInitialized) {
    await client.initialize();
    isInitialized = true;
  }

  return client;
}

// Função para usar em Server Components
export async function withAiAdmin<T>(
  handler: (client: AiAdminClient) => Promise<T>
): Promise<T> {
  const client = await getAiAdminClient();
  return handler(client);
}
```

## 🔗 Endpoints Automáticos

### 1. Webhook (app/api/ai-admin/webhook/route.ts)
Recebe comandos e dados do dashboard:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAiAdminClient } from '@/lib/ai-admin-client';

export async function POST(request: NextRequest) {
  try {
    const client = await getAiAdminClient();
    const data = await request.json();
    
    // Processar comandos do dashboard
    switch (data.type) {
      case 'chat':
        return await handleChat(data);
      case 'status_check':
        return await handleStatusCheck();
      case 'user_session':
        return await handleUserSession(data);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
```

### 2. Autenticação (app/api/ai-admin/auth/route.ts)
Endpoint para validação de tokens:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAiAdminClient } from '@/lib/ai-admin-client';

export async function POST(request: NextRequest) {
  try {
    const { userId, tenantId } = await request.json();
    const client = await getAiAdminClient();
    
    // Criar sessão para usuário
    const session = await client.createUserSession(userId, tenantId);
    
    return NextResponse.json({ 
      success: true,
      sessionId: session.sessionId 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 401 });
  }
}
```

### 3. Chat Exemplo (app/api/chat/route.ts)
Exemplo completo de integração:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAiAdminClient } from '@/lib/ai-admin-client';

export async function POST(request: NextRequest) {
  try {
    const { message, userId, tenantId } = await request.json();
    const client = await getAiAdminClient();
    
    // 1. Criar sessão de usuário
    const session = await client.createUserSession(userId, tenantId);
    
    // 2. Processar mensagem (sua lógica aqui)
    const response = await processMessage(message);
    
    // 3. Reportar uso automaticamente
    await client.reportUsage({
      sessionId: session.sessionId,
      userId,
      tenantId,
      action: 'chat_message',
      tokensUsed: response.tokensUsed,
      metadata: {
        messageLength: message.length,
        responseTime: response.responseTime
      }
    });
    
    // 4. Encerrar sessão
    await client.endUserSession(session.sessionId);
    
    return NextResponse.json({
      message: response.content,
      tokensUsed: response.tokensUsed
    });
  } catch (error) {
    // Reportar erro automaticamente
    const client = await getAiAdminClient();
    await client.reportError({
      error: error.message,
      errorCode: 'CHAT_ERROR',
      context: { endpoint: '/api/chat' }
    });
    
    return NextResponse.json({ 
      error: 'Erro ao processar mensagem' 
    }, { status: 500 });
  }
}

async function processMessage(message: string) {
  // Simular processamento
  return {
    content: `Resposta para: ${message}`,
    tokensUsed: Math.floor(message.length * 0.75),
    responseTime: Date.now()
  };
}
```

## 🎯 Componente de Status

### components/ai-admin-status.tsx
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatusData {
  connected: boolean;
  activeSessions: number;
  tokensUsed: number;
  errorsReported: number;
}

export function AiAdminStatus() {
  const [status, setStatus] = useState<StatusData | null>(null);
  
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/ai-admin/status');
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error('Erro ao buscar status:', error);
      }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Atualizar a cada 30s
    
    return () => clearInterval(interval);
  }, []);
  
  if (!status) return <div>Carregando status...</div>;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status AI Admin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span>Conexão:</span>
          <Badge variant={status.connected ? 'success' : 'destructive'}>
            {status.connected ? 'Conectado' : 'Desconectado'}
          </Badge>
        </div>
        <div>Sessões Ativas: {status.activeSessions}</div>
        <div>Tokens Utilizados: {status.tokensUsed}</div>
        <div>Erros Reportados: {status.errorsReported}</div>
      </CardContent>
    </Card>
  );
}
```

## 📝 Fluxo Completo de Uso

### 1. Página Exemplo (app/chat/page.tsx)
```typescript
'use client';

import { useState } from 'react';
import { AiAdminStatus } from '@/components/ai-admin-status';

export default function ChatPage() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSend = async () => {
    setLoading(true);
    try {
      const result = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          userId: 'user-123',
          tenantId: 'tenant-456'
        })
      });
      
      const data = await result.json();
      setResponse(data.message);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <h1 className="text-2xl font-bold mb-4">Chat com IA</h1>
          <div className="space-y-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="w-full p-2 border rounded"
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar'}
            </button>
            {response && (
              <div className="p-4 bg-gray-100 rounded">
                <strong>Resposta:</strong> {response}
              </div>
            )}
          </div>
        </div>
        <div>
          <AiAdminStatus />
        </div>
      </div>
    </div>
  );
}
```

## 🔧 Comandos Disponíveis

### Inicialização Completa
```bash
# Setup completo para Next.js
npx ai-admin-init --nextjs

# Ou para projeto existente
npx ai-admin-init --nextjs --existing
```

### Solicitação de Conexão
```bash
# Solicitar registro no dashboard
npx ai-admin-request \
  --name "Minha Aplicação" \
  --email "admin@meusite.com" \
  --website "https://meusite.com" \
  --description "Bot de atendimento" \
  --capabilities "chat,image,text"
```

### Verificar Status
```bash
# Testar conexão
npx ai-admin-test

# Verificar logs
npx ai-admin-logs
```

## 📊 Monitoramento Automático

O package automaticamente envia os seguintes dados:

### 1. **Telemetria de Uso**
- Tokens consumidos por ação
- Tempo de resposta
- Tipo de interação
- Metadados customizados

### 2. **Relatórios de Erro**
- Stack traces completos
- Contexto da aplicação
- Gravidade do erro
- Informações do usuário/sessão

### 3. **Analytics**
- Sessões ativas
- Padrões de uso
- Performance metrics
- Dados de usuário (anonimizados)

### 4. **Status de Saúde**
- Heartbeat da aplicação
- Status dos serviços
- Métricas de sistema
- Alertas automáticos

## 🚨 Tratamento de Erros

### Automático
- Erros não capturados são automaticamente reportados
- Context completo é incluído
- Retry automático para falhas de rede

### Manual
```typescript
import { getAiAdminClient } from '@/lib/ai-admin-client';

try {
  // Sua lógica aqui
} catch (error) {
  const client = await getAiAdminClient();
  await client.reportError({
    error: error.message,
    errorCode: 'CUSTOM_ERROR',
    context: {
      userId: 'user-123',
      action: 'specific-action',
      data: { /* contexto relevante */ }
    }
  });
}
```

## 🔐 Segurança

### Validação Automática
- Tokens JWT validados automaticamente
- Permissões verificadas por usuário
- Rate limiting integrado
- Logs de auditoria

### Boas Práticas
```typescript
// Sempre usar variáveis de ambiente
const config = {
  dashboardUrl: process.env.DASHBOARD_URL,
  botSecret: process.env.BOT_SECRET, // NUNCA no código
};

// Validar usuários antes de processar
const session = await client.createUserSession(userId, tenantId);
if (!session) {
  throw new Error('Usuário não autorizado');
}
```

## 🚀 Deploy

### Vercel
```bash
# Configurar variáveis de ambiente
vercel env add DASHBOARD_URL
vercel env add BOT_ID  
vercel env add BOT_SECRET

# Deploy
vercel --prod
```

### Docker
```dockerfile
# .env será criado automaticamente pelo init
COPY .env .env

# O package já inclui todas as dependências
RUN npm install dengun_ai-admin-client
```

## 📞 Suporte

- **Documentação**: README.md completo
- **Exemplos**: Pasta `/examples` com casos de uso
- **Issues**: GitHub Issues para problemas
- **Logs**: `npx ai-admin-logs` para debugging

---

## 🎉 Resultado Final

Após seguir este guia, você terá:

1. ✅ **Aplicação Next.js** completamente integrada
2. ✅ **Monitoramento automático** de uso e erros
3. ✅ **Dashboard conectado** com dados em tempo real
4. ✅ **Endpoints prontos** para receber usuários
5. ✅ **Componentes visuais** para status
6. ✅ **Deploy pronto** para produção

**🚀 Sua aplicação Next.js agora está 100% integrada ao AI Admin Dashboard!** 