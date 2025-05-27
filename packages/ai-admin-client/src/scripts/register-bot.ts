#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';

const PACKAGE_DIR = 'dengun_ai-admin';

async function checkRequestStatus(requestId: string, dashboardUrl: string): Promise<void> {
  try {
    const response = await axios.get(
      `${dashboardUrl}/api/bots/request?requestId=${requestId}`
    );

    const { status, message } = response.data;

    console.log('\n📋 Status da Solicitação:');
    console.log('------------------------');
    console.log(`Status: ${status}`);
    if (message) console.log(`Mensagem: ${message}`);

    if (status === 'pending') {
      console.log('\n⏳ Aguardando aprovação do Super Admin...');
      console.log('🔄 Verificando novamente em 10 segundos...');
      setTimeout(() => checkRequestStatus(requestId, dashboardUrl), 10000);
    } else if (status === 'approved') {
      console.log('\n✅ Solicitação aprovada!');
      console.log('🎉 Seu bot foi aprovado e está pronto para uso.');
      console.log('\n📋 Próximos passos:');
      console.log('1. Execute o teste de conexão:');
      console.log(`   npx ts-node ${PACKAGE_DIR}/tests/connection.test.ts`);
      process.exit(0);
    } else if (status === 'rejected') {
      console.log('\n❌ Solicitação rejeitada');
      if (message) console.log(`Motivo: ${message}`);
      console.log('\n⚠️ Você pode tentar novamente com informações diferentes.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Erro ao verificar status:', error instanceof Error ? error.message : 'Erro desconhecido');
    console.log('\n🔄 Tentando novamente em 10 segundos...');
    setTimeout(() => checkRequestStatus(requestId, dashboardUrl), 10000);
  }
}

async function registerBot() {
  try {
    console.log('🚀 Iniciando registro do bot...');

    // Carregar variáveis de ambiente
    const envPath = path.join(process.cwd(), PACKAGE_DIR, '.env');
    if (!fs.existsSync(envPath)) {
      console.error('❌ Arquivo .env não encontrado!');
      console.log('⚠️ Execute primeiro o comando de inicialização:');
      console.log('npx -p dengun_ai-admin-client dengun-ai-init');
      process.exit(1);
    }

    dotenv.config({ path: envPath });

    // Verificar variáveis obrigatórias
    const requiredEnvVars = [
      'BOT_NAME',
      'BOT_DESCRIPTION',
      'BOT_CAPABILITIES',
      'BOT_CONTACT_EMAIL',
      'DASHBOARD_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error('❌ Variáveis de ambiente obrigatórias não encontradas:');
      missingVars.forEach(varName => console.log(`- ${varName}`));
      console.log('\n⚠️ Configure estas variáveis no arquivo .env');
      process.exit(1);
    }

    // Preparar dados do bot
    const botData = {
      name: process.env.BOT_NAME,
      description: process.env.BOT_DESCRIPTION,
      capabilities: process.env.BOT_CAPABILITIES?.split(','),
      contactEmail: process.env.BOT_CONTACT_EMAIL,
      website: process.env.BOT_WEBSITE,
      maxTokensPerRequest: parseInt(process.env.MAX_TOKENS_PER_REQUEST || '1000')
    };

    // Enviar solicitação para o dashboard
    console.log('📡 Enviando solicitação para o dashboard...');
    console.log('📋 Dados do bot:', JSON.stringify(botData, null, 2));
    
    try {
      const response = await axios.post(
        `${process.env.DASHBOARD_URL}/api/bots/request`,
        botData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('📥 Resposta do dashboard:', JSON.stringify(response.data, null, 2));

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const { requestId } = response.data;
      console.log('\n✅ Solicitação enviada com sucesso!');
      console.log(`📝 ID da solicitação: ${requestId}`);

      // Iniciar verificação periódica do status
      console.log('\n🔄 Iniciando verificação do status...');
      await checkRequestStatus(requestId, process.env.DASHBOARD_URL!);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('\n❌ Erro ao registrar bot:', error.response?.data || error.message);
        console.log('\n🔍 Detalhes do erro:');
        console.log('Status:', error.response?.status);
        console.log('Headers:', error.response?.headers);
        console.log('Data:', error.response?.data);
      } else {
        console.error('\n❌ Erro ao registrar bot:', error instanceof Error ? error.message : 'Erro desconhecido');
      }
      console.log('\n🔍 Possíveis soluções:');
      console.log('1. Verifique se o dashboard está online');
      console.log('2. Verifique se as variáveis de ambiente estão corretas');
      console.log('3. Verifique se o bot já não está registrado');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Erro ao registrar bot:', error instanceof Error ? error.message : 'Erro desconhecido');
    console.log('\n🔍 Possíveis soluções:');
    console.log('1. Verifique se o dashboard está online');
    console.log('2. Verifique se as variáveis de ambiente estão corretas');
    console.log('3. Verifique se o bot já não está registrado');
    process.exit(1);
  }
}

registerBot(); 