#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';

const PACKAGE_DIR = 'dengun_ai-admin';

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
    const response = await axios.post(
      `${process.env.DASHBOARD_URL}/api/bots`,
      botData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    // Atualizar .env com o token recebido
    if (response.data.token) {
      let envContent = fs.readFileSync(envPath, 'utf-8');
      
      if (envContent.includes('BOT_TOKEN=')) {
        envContent = envContent.replace(/BOT_TOKEN=.*/, `BOT_TOKEN="${response.data.token}"`);
      } else {
        envContent = envContent + '\nBOT_TOKEN="' + response.data.token + '"';
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Token salvo no arquivo .env');
    }

    console.log('\n🎉 Bot registrado com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Aguarde a aprovação do bot no dashboard');
    console.log('2. Execute o teste de conexão:');
    console.log(`   npx ts-node ${PACKAGE_DIR}/tests/connection.test.ts`);
    console.log('\n⚠️ Importante:');
    console.log('- O bot só poderá ser usado após aprovação');
    console.log('- Monitore o status da solicitação no dashboard');

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