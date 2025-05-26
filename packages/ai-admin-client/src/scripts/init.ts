import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const createEnvFile = () => {
  const envContent = `# Configurações do Bot
BOT_NAME="Nome do seu bot"
BOT_DESCRIPTION="Descrição detalhada do seu bot"
BOT_CAPABILITIES="chat,image-generation,text-analysis"
BOT_CONTACT_EMAIL="seu@email.com"
BOT_WEBSITE="https://seu-bot.com"
MAX_TOKENS_PER_REQUEST=1000

# Configurações do Dashboard
DASHBOARD_URL="https://seu-dashboard.com"
DASHBOARD_TOKEN="seu-token-jwt"
DASHBOARD_USER_ID="id-do-usuario"
DASHBOARD_TENANT_ID="id-do-tenant"
`;

  fs.writeFileSync('.env', envContent);
  console.log('✅ Arquivo .env criado com sucesso!');
};

const createConfigFile = () => {
  const configContent = `import { createBotConnection } from 'dengun_ai-admin-client';
import dotenv from 'dotenv';

dotenv.config();

const botConfig = {
  baseUrl: process.env.DASHBOARD_URL,
  token: process.env.DASHBOARD_TOKEN,
  userId: process.env.DASHBOARD_USER_ID,
  tenantId: process.env.DASHBOARD_TENANT_ID
};

export const botConnection = createBotConnection(botConfig);
`;

  fs.writeFileSync('src/config/bot.ts', configContent);
  console.log('✅ Arquivo de configuração do bot criado com sucesso!');
};

const createExampleFile = () => {
  const exampleContent = `import { botConnection } from './config/bot';

async function main() {
  try {
    // Verificar status da solicitação
    const requestStatus = await botConnection.checkRequestStatus();
    console.log('Status da solicitação:', requestStatus);

    // Se aprovado, você pode usar os outros métodos
    if (requestStatus.status === 'approved') {
      // Verificar status da conexão
      const status = await botConnection.ping();
      console.log('Status da conexão:', status);

      // Obter acesso aos bots
      const botAccess = await botConnection.getBotAccess();
      console.log('Bots disponíveis:', botAccess);

      // Obter uso de tokens
      const tokenUsage = await botConnection.getTokenUsage();
      console.log('Uso de tokens:', tokenUsage);
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

main();
`;

  fs.writeFileSync('src/examples/bot-usage.ts', exampleContent);
  console.log('✅ Arquivo de exemplo criado com sucesso!');
};

const updatePackageJson = () => {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Adicionar dotenv como dependência
  if (!packageJson.dependencies.dotenv) {
    packageJson.dependencies.dotenv = '^16.0.0';
  }

  // Adicionar script de inicialização
  if (!packageJson.scripts.init) {
    packageJson.scripts.init = 'ts-node node_modules/dengun_ai-admin-client/dist/scripts/init.js';
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ package.json atualizado com sucesso!');
};

const main = () => {
  try {
    // Criar diretórios necessários
    fs.mkdirSync('src/config', { recursive: true });
    fs.mkdirSync('src/examples', { recursive: true });

    // Criar arquivos
    createEnvFile();
    createConfigFile();
    createExampleFile();
    updatePackageJson();

    // Instalar dependências
    console.log('📦 Instalando dependências...');
    execSync('npm install', { stdio: 'inherit' });

    console.log('\n🎉 Configuração concluída com sucesso!');
    console.log('\nPróximos passos:');
    console.log('1. Edite o arquivo .env com suas configurações');
    console.log('2. Execute o exemplo: npm run start');
  } catch (error) {
    console.error('❌ Erro durante a configuração:', error);
  }
};

main(); 