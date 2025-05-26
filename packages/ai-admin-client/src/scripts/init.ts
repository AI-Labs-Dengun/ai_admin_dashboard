#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import axios from 'axios';
import dotenv from 'dotenv';

const PACKAGE_DIR = 'dengun_ai-admin';

interface TenantConfig {
  tenantId: string;
  token: string;
  userId: string;
  limits?: {
    maxTokensPerRequest: number;
    maxRequestsPerDay: number;
  };
}

const createEnvFile = async (dashboardUrl: string) => {
  const envContent = `# Configurações do Bot
BOT_NAME="Nome do seu bot"
BOT_DESCRIPTION="Descrição detalhada do seu bot"
BOT_CAPABILITIES="chat,image-generation,text-analysis"
BOT_CONTACT_EMAIL="seu@email.com"
BOT_WEBSITE="https://seu-bot.com"
MAX_TOKENS_PER_REQUEST=1000

# Configurações do Dashboard
DASHBOARD_URL="${dashboardUrl}"

# Configurações dos Tenants
# Formato: TENANT_[ID]_TOKEN="seu-token-jwt"
# Exemplo: TENANT_123_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
`;

  const envPath = path.join(process.cwd(), PACKAGE_DIR, '.env');
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Arquivo .env criado com sucesso!');
  } else {
    console.log('ℹ️ Arquivo .env já existe. Mantendo configurações existentes.');
  }
};

const createConfigFile = () => {
  const configContent = `import { createBotConnection } from 'dengun_ai-admin-client';
import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configuração base do bot
const botConfig = {
  baseUrl: process.env.DASHBOARD_URL,
  botName: process.env.BOT_NAME,
  botDescription: process.env.BOT_DESCRIPTION,
  botCapabilities: process.env.BOT_CAPABILITIES?.split(',') || [],
  contactEmail: process.env.BOT_CONTACT_EMAIL,
  website: process.env.BOT_WEBSITE,
  maxTokensPerRequest: parseInt(process.env.MAX_TOKENS_PER_REQUEST || '1000')
};

// Função para obter todos os tenants configurados
const getTenantConfigs = (): { [key: string]: any } => {
  const tenantConfigs: { [key: string]: any } = {};
  const envVars = process.env;

  // Procura por variáveis de ambiente que começam com TENANT_
  Object.keys(envVars).forEach(key => {
    if (key.startsWith('TENANT_') && key.endsWith('_TOKEN')) {
      const tenantId = key.replace('TENANT_', '').replace('_TOKEN', '');
      tenantConfigs[tenantId] = {
        token: envVars[key],
        userId: envVars[\`TENANT_\${tenantId}_USER_ID\`] || '',
        limits: {
          maxTokensPerRequest: parseInt(envVars[\`TENANT_\${tenantId}_MAX_TOKENS\`] || '1000'),
          maxRequestsPerDay: parseInt(envVars[\`TENANT_\${tenantId}_MAX_REQUESTS\`] || '1000')
        }
      };
    }
  });

  return tenantConfigs;
};

// Criar conexões para cada tenant
const tenantConnections = Object.entries(getTenantConfigs()).reduce((acc, [tenantId, config]) => {
  acc[tenantId] = createBotConnection({
    ...botConfig,
    token: config.token,
    userId: config.userId,
    tenantId
  });
  return acc;
}, {} as { [key: string]: any });

export const botConnection = tenantConnections;
export const getTenantConnection = (tenantId: string) => tenantConnections[tenantId];
`;

  const configDir = path.join(process.cwd(), PACKAGE_DIR, 'config');
  const configPath = path.join(configDir, 'bot.ts');

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, configContent);
    console.log('✅ Arquivo de configuração do bot criado com sucesso!');
  } else {
    console.log('ℹ️ Arquivo de configuração do bot já existe. Mantendo configurações existentes.');
  }
};

const createExampleFile = () => {
  const exampleContent = `import { botConnection, getTenantConnection } from '../config/bot';

async function main() {
  try {
    // Exemplo de uso com múltiplos tenants
    for (const [tenantId, connection] of Object.entries(botConnection)) {
      console.log(\`\\nVerificando conexão para o tenant \${tenantId}...\`);

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

    // Exemplo de uso com um tenant específico
    const specificTenantId = 'seu-tenant-id';
    const specificConnection = getTenantConnection(specificTenantId);
    if (specificConnection) {
      console.log(\`\\nUsando conexão específica para o tenant \${specificTenantId}...\`);
      const status = await specificConnection.ping();
      console.log('Status da conexão:', status);
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

main();
`;

  const examplesDir = path.join(process.cwd(), PACKAGE_DIR, 'examples');
  const examplePath = path.join(examplesDir, 'bot-usage.ts');

  if (!fs.existsSync(examplesDir)) {
    fs.mkdirSync(examplesDir, { recursive: true });
  }

  if (!fs.existsSync(examplePath)) {
    fs.writeFileSync(examplePath, exampleContent);
    console.log('✅ Arquivo de exemplo criado com sucesso!');
  } else {
    console.log('ℹ️ Arquivo de exemplo já existe. Mantendo configurações existentes.');
  }
};

const main = async () => {
  try {
    console.log('🚀 Iniciando configuração do dengun_ai-admin-client...');

    // Criar pasta principal
    const packageDir = path.join(process.cwd(), PACKAGE_DIR);
    if (!fs.existsSync(packageDir)) {
      fs.mkdirSync(packageDir, { recursive: true });
    }

    // Criar arquivos de configuração
    await createEnvFile('https://seu-dashboard.com');
    createConfigFile();
    createExampleFile();

    console.log('\n🎉 Configuração concluída com sucesso!');
    console.log('\nPróximos passos:');
    console.log(`1. Edite o arquivo ${PACKAGE_DIR}/.env com suas configurações`);
    console.log('2. Para cada tenant, adicione as seguintes variáveis:');
    console.log('   TENANT_[ID]_TOKEN="seu-token-jwt"');
    console.log('   TENANT_[ID]_USER_ID="id-do-usuario"');
    console.log('   TENANT_[ID]_MAX_TOKENS=1000');
    console.log('   TENANT_[ID]_MAX_REQUESTS=1000');
    console.log('3. Importe e use o botConnection em seu código:');
    console.log(`   import { botConnection, getTenantConnection } from './${PACKAGE_DIR}/config/bot';`);
    console.log(`4. Verifique o exemplo em ${PACKAGE_DIR}/examples/bot-usage.ts`);
  } catch (error) {
    console.error('❌ Erro durante a configuração:', error);
    process.exit(1);
  }
};

main(); 