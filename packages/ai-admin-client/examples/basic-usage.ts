import { AiAdminClient } from '../src/index';

async function exemploBasico() {
  console.log('🚀 Iniciando exemplo do AI Admin Client v2.0\n');

  // 1. Configuração simples - apenas 3 parâmetros obrigatórios
  const client = new AiAdminClient({
    dashboardUrl: 'http://localhost:3000',
    botId: 'exemplo-bot',
    botSecret: 'secret-123',
    options: {
      debug: true, // Ativar logs para o exemplo
      autoReportUsage: true,
      autoReportErrors: true
    }
  });

  try {
    // 2. Inicializar cliente (conecta ao dashboard)
    console.log('📡 Conectando ao dashboard...');
    await client.initialize();
    console.log('✅ Conectado com sucesso!\n');

    // 3. Criar sessão para usuário
    console.log('👤 Criando sessão para usuário...');
    const session = await client.createUserSession('user-123', 'tenant-456', {
      userAgent: 'ExemploApp/1.0',
      ip: '192.168.1.100'
    });
    console.log(`✅ Sessão criada: ${session.sessionId}\n`);

    // 4. Simular uso do bot
    console.log('🤖 Simulando interações do bot...');
    
    // Primeira interação - Chat
    await client.reportUsage({
      sessionId: session.sessionId,
      userId: 'user-123',
      tenantId: 'tenant-456',
      action: 'chat_message',
      tokensUsed: 50,
      metadata: { messageType: 'text', responseTime: 1200 }
    });
    console.log('📊 Uso reportado: Chat (50 tokens)');

    // Segunda interação - Geração de imagem
    await client.reportUsage({
      sessionId: session.sessionId,
      userId: 'user-123',
      tenantId: 'tenant-456',
      action: 'image_generation',
      tokensUsed: 100,
      metadata: { imageSize: '1024x1024', style: 'realistic' }
    });
    console.log('📊 Uso reportado: Imagem (100 tokens)');

    // 5. Simular um erro (para demonstrar relatório de erros)
    console.log('\n⚠️ Simulando um erro...');
    await client.reportError({
      sessionId: session.sessionId,
      userId: 'user-123',
      tenantId: 'tenant-456',
      error: 'Rate limit exceeded',
      errorCode: 'RATE_LIMIT_ERROR',
      context: {
        currentRequests: 100,
        limit: 100,
        resetTime: Date.now() + 3600000
      }
    });
    console.log('🐛 Erro reportado: Rate limit');

    // 6. Verificar status e estatísticas
    console.log('\n📈 Verificando status...');
    const status = await client.getConnectionStatus();
    console.log('Conexão:', status.connected ? '🟢 Ativa' : '🔴 Inativa');
    
    const stats = await client.getUsageStats();
    console.log('Estatísticas:', {
      totalTokens: stats.local?.totalTokens || 0,
      totalInterações: stats.local?.totalUsage || 0
    });

    const sessionsAtivas = client.getActiveSessions();
    console.log('Sessões ativas:', sessionsAtivas.length);

    // 7. Encerrar sessão
    console.log('\n🔚 Encerrando sessão...');
    await client.endUserSession(session.sessionId);
    console.log('✅ Sessão encerrada');

  } catch (error) {
    console.error('❌ Erro durante execução:', error);
  } finally {
    // 8. Sempre encerrar o cliente
    console.log('\n🔌 Desconectando cliente...');
    await client.shutdown();
    console.log('✅ Cliente desconectado');
  }
}

// Exemplo de integração com Express.js
function exemploExpress() {
  console.log(`
🌐 Exemplo de integração com Express.js:

import express from 'express';
import { AiAdminClient } from 'dengun_ai-admin-client';

const app = express();
const aiClient = new AiAdminClient({
  dashboardUrl: process.env.DASHBOARD_URL!,
  botId: process.env.BOT_ID!,
  botSecret: process.env.BOT_SECRET!
});

// Inicializar cliente na startup
await aiClient.initialize();

app.post('/api/chat', async (req, res) => {
  const { userId, tenantId, message } = req.body;
  
  try {
    // Criar sessão
    const session = await aiClient.createUserSession(userId, tenantId);
    
    // Processar mensagem (sua lógica aqui)
    const response = await processMessage(message);
    
    // Reportar uso automaticamente
    await aiClient.reportUsage({
      sessionId: session.sessionId,
      userId,
      tenantId,
      action: 'chat',
      tokensUsed: response.tokensUsed
    });
    
    res.json({ response: response.text, sessionId: session.sessionId });
  } catch (error) {
    // Erros são reportados automaticamente
    res.status(500).json({ error: 'Erro interno' });
  }
});
  `);
}

// Executar exemplos
if (require.main === module) {
  exemploBasico()
    .then(() => {
      console.log('\n📚 Mais exemplos disponíveis:');
      exemploExpress();
      console.log('\n🎉 Exemplo concluído! Package está pronto para uso.');
    })
    .catch(console.error);
}

export { exemploBasico, exemploExpress }; 