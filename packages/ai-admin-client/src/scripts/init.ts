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
import fs from 'fs';

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

// Classe para gerenciar a sincronização dos tenants
class TenantSyncManager {
  private static instance: TenantSyncManager;
  private syncInterval: NodeJS.Timeout | null = null;
  private tenantConnections: { [key: string]: any } = {};
  private lastSync: { [key: string]: number } = {};

  private constructor() {
    this.startSync();
  }

  public static getInstance(): TenantSyncManager {
    if (!TenantSyncManager.instance) {
      TenantSyncManager.instance = new TenantSyncManager();
    }
    return TenantSyncManager.instance;
  }

  public async syncTenants() {
    try {
      // Buscar lista atualizada de tenants do dashboard
      const response = await fetch(\`\${botConfig.baseUrl}/api/bots/tenants\`, {
        headers: {
          'Authorization': \`Bearer \${process.env.BOT_TOKEN}\`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar tenants');
      }

      const tenants = await response.json();
      
      // Atualizar conexões
      for (const tenant of tenants) {
        const tenantId = tenant.id;
        
        // Verificar se o tenant já existe e se precisa ser atualizado
        if (!this.tenantConnections[tenantId] || 
            this.lastSync[tenantId] < tenant.updatedAt) {
          
          // Criar ou atualizar conexão
          this.tenantConnections[tenantId] = createBotConnection({
            ...botConfig,
            token: tenant.token,
            userId: tenant.userId,
            tenantId: tenant.id
          });

          this.lastSync[tenantId] = Date.now();
          
          // Atualizar arquivo .env com as novas informações
          this.updateEnvFile(tenant);
        }
      }

      // Remover tenants que não existem mais
      for (const tenantId of Object.keys(this.tenantConnections)) {
        if (!tenants.find((t: any) => t.id === tenantId)) {
          delete this.tenantConnections[tenantId];
          delete this.lastSync[tenantId];
          this.removeTenantFromEnv(tenantId);
        }
      }
    } catch (error) {
      console.error('Erro na sincronização dos tenants:', error);
      throw error;
    }
  }

  private updateEnvFile(tenant: any) {
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');

    // Atualizar ou adicionar variáveis do tenant
    const tenantVars = [
      \`TENANT_\${tenant.id}_TOKEN="\${tenant.token}"\`,
      \`TENANT_\${tenant.id}_USER_ID="\${tenant.userId}"\`,
      \`TENANT_\${tenant.id}_MAX_TOKENS=\${tenant.maxTokens}\`,
      \`TENANT_\${tenant.id}_MAX_REQUESTS=\${tenant.maxRequests}\`
    ];

    for (const var_ of tenantVars) {
      const [key] = var_.split('=');
      const regex = new RegExp(\`^\${key}.*$\`, 'm');
      
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, var_);
      } else {
        envContent += \`\\n\${var_}\`;
      }
    }

    fs.writeFileSync(envPath, envContent);
  }

  private removeTenantFromEnv(tenantId: string) {
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');

    // Remover todas as variáveis do tenant
    const regex = new RegExp(\`^TENANT_\${tenantId}_.*$\`, 'gm');
    envContent = envContent.replace(regex, '').replace(/\\n\\n+/g, '\\n');

    fs.writeFileSync(envPath, envContent);
  }

  public startSync(interval = 5 * 60 * 1000) { // 5 minutos por padrão
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Sincronização inicial
    this.syncTenants();
    
    // Configurar sincronização periódica
    this.syncInterval = setInterval(() => this.syncTenants(), interval);
  }

  public stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  public getConnections() {
    return this.tenantConnections;
  }

  public getConnection(tenantId: string) {
    return this.tenantConnections[tenantId];
  }
}

// Exportar instância do gerenciador de sincronização
export const tenantSync = TenantSyncManager.getInstance();

// Exportar conexões para compatibilidade com código existente
export const botConnection = tenantSync.getConnections();
export const getTenantConnection = (tenantId: string) => tenantSync.getConnection(tenantId);
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

const createTestFile = () => {
  const testContent = `import { botConnection, getTenantConnection, tenantSync } from '../config/bot';
import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testConnection() {
  try {
    console.log('🧪 Iniciando teste de conexão...');
    console.log('📋 Verificando configurações...');
    
    // Verificar se o BOT_TOKEN está configurado
    if (!process.env.BOT_TOKEN) {
      console.error('❌ BOT_TOKEN não encontrado no arquivo .env');
      console.log('⚠️ Adicione a seguinte linha ao seu arquivo .env:');
      console.log('BOT_TOKEN="seu-token-jwt"');
      return;
    }

    // Verificar se o DASHBOARD_URL está configurado
    if (!process.env.DASHBOARD_URL) {
      console.error('❌ DASHBOARD_URL não encontrado no arquivo .env');
      console.log('⚠️ Adicione a seguinte linha ao seu arquivo .env:');
      console.log('DASHBOARD_URL="https://seu-dashboard.com"');
      return;
    }

    console.log('✅ Configurações básicas verificadas');
    
    // Testar sincronização de tenants
    console.log('\\n🔄 Testando sincronização de tenants...');
    try {
      await tenantSync.syncTenants();
      const connections = tenantSync.getConnections();
      
      if (Object.keys(connections).length === 0) {
        console.log('⚠️ Nenhum tenant encontrado');
        console.log('ℹ️ Aguarde o Super Admin associar um tenant ao seu bot no dashboard');
        return;
      }

      console.log('✅ Tenants sincronizados:', Object.keys(connections));
      
      // Mostrar detalhes de cada tenant
      for (const [tenantId, connection] of Object.entries(connections)) {
        console.log(\`\\n📋 Detalhes do Tenant \${tenantId}:\`);
        
        // Verificar status da solicitação
        console.log('📡 Verificando status da solicitação...');
        const requestStatus = await connection.checkRequestStatus();
        console.log('Status da solicitação:', requestStatus.status);

        if (requestStatus.status === 'approved') {
          // Verificar status da conexão
          console.log('📡 Verificando status da conexão...');
          const status = await connection.ping();
          console.log('Status da conexão:', status ? '✅ Conectado' : '❌ Desconectado');

          // Obter acesso aos bots
          console.log('📡 Obtendo acesso aos bots...');
          const botAccess = await connection.getBotAccess();
          console.log('Bots disponíveis:', botAccess);

          // Obter uso de tokens
          console.log('📡 Obtendo uso de tokens...');
          const tokenUsage = await connection.getTokenUsage();
          console.log('Uso de tokens:', tokenUsage);
        } else {
          console.log('⚠️ Bot ainda não foi aprovado para este tenant');
          console.log('ℹ️ Aguarde a aprovação do Super Admin no dashboard');
        }
      }
    } catch (error) {
      console.error('❌ Erro durante a sincronização:', error);
      console.log('\\n🔍 Possíveis soluções:');
      console.log('1. Verifique se o BOT_TOKEN está correto');
      console.log('2. Verifique se o DASHBOARD_URL está correto');
      console.log('3. Verifique se o dashboard está online');
      console.log('4. Verifique se o bot foi registrado no dashboard');
    }
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar o teste
console.log('🚀 Iniciando teste de conexão do bot...');
testConnection().then(() => {
  console.log('\\n✨ Teste concluído!');
});`;

  const testDir = path.join(process.cwd(), PACKAGE_DIR, 'tests');
  const testPath = path.join(testDir, 'connection.test.ts');

  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  if (!fs.existsSync(testPath)) {
    fs.writeFileSync(testPath, testContent);
    console.log('✅ Arquivo de teste criado com sucesso!');
  } else {
    console.log('ℹ️ Arquivo de teste já existe. Mantendo configurações existentes.');
  }
};

const createTypesFile = () => {
  const typesContent = `declare module 'dengun_ai-admin-client' {
  export function createBotConnection(config: {
    baseUrl: string;
    token: string;
    userId: string;
    tenantId: string;
    botName?: string;
    botDescription?: string;
    botCapabilities?: string[];
    contactEmail?: string;
    website?: string;
    maxTokensPerRequest?: number;
  }): {
    sendMessage: (message: string) => Promise<any>;
    getHistory: () => Promise<any>;
    disconnect: () => void;
  };
}`;

  const typesDir = path.join(process.cwd(), PACKAGE_DIR, 'types');
  const typesPath = path.join(typesDir, 'dengun_ai-admin-client.d.ts');

  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }

  if (!fs.existsSync(typesPath)) {
    fs.writeFileSync(typesPath, typesContent);
    console.log('✅ Arquivo de tipos criado com sucesso!');
  } else {
    console.log('ℹ️ Arquivo de tipos já existe. Mantendo configurações existentes.');
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
    createTestFile();
    createTypesFile();

    console.log('\n🎉 Configuração concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log(`1. Edite o arquivo ${PACKAGE_DIR}/.env com suas configurações:`);
    console.log('   BOT_TOKEN="seu-token-jwt"');
    console.log('   DASHBOARD_URL="https://seu-dashboard.com"');
    console.log('   BOT_NAME="Nome do seu bot"');
    console.log('   BOT_DESCRIPTION="Descrição do seu bot"');
    console.log('   BOT_CAPABILITIES="chat,image-generation,text-analysis"');
    console.log('   BOT_CONTACT_EMAIL="seu@email.com"');
    console.log('   BOT_WEBSITE="https://seu-bot.com"');
    console.log('   MAX_TOKENS_PER_REQUEST=1000');
    
    console.log('\n🔍 Para testar a conexão:');
    console.log('1. Instale as dependências necessárias:');
    console.log('   npm install -D ts-node typescript @types/node');
    console.log('2. Execute o teste de conexão:');
    console.log(`   npx ts-node ${PACKAGE_DIR}/tests/connection.test.ts`);
    
    console.log('\n📚 Recursos disponíveis:');
    console.log(`- Exemplo de uso: ${PACKAGE_DIR}/examples/bot-usage.ts`);
    console.log(`- Teste de conexão: ${PACKAGE_DIR}/tests/connection.test.ts`);
    console.log(`- Configuração do bot: ${PACKAGE_DIR}/config/bot.ts`);
    
    console.log('\n⚠️ Importante:');
    console.log('- Aguarde a aprovação do bot no dashboard após a primeira conexão');
    console.log('- Monitore o status da conexão regularmente');
    console.log('- Verifique os logs para identificar possíveis problemas');
  } catch (error) {
    console.error('❌ Erro durante a configuração:', error);
    process.exit(1);
  }
};

main(); 