import { AiAdminClient } from '../AiAdminClient';
import { ClientConfig } from '../types/index';

// Mock dos serviços
jest.mock('../services/ConnectionManager');
jest.mock('../services/TelemetryReporter');
jest.mock('../services/ErrorReporter');

describe('AiAdminClient', () => {
  const mockConfig: ClientConfig = {
    dashboardUrl: 'http://localhost:3000',
    botId: 'test-bot',
    botSecret: 'test-secret'
  };

  let client: AiAdminClient;

  beforeEach(() => {
    client = new AiAdminClient(mockConfig);
  });

  afterEach(async () => {
    if (client) {
      try {
        await client.shutdown();
      } catch (error) {
        // Ignorar erros no cleanup
      }
    }
  });

  describe('Configuração', () => {
    it('deve criar cliente com configuração mínima', () => {
      expect(client).toBeDefined();
    });

    it('deve aplicar configurações padrão', () => {
      const configWithDefaults = new AiAdminClient(mockConfig);
      expect(configWithDefaults).toBeDefined();
    });

    it('deve aceitar configurações personalizadas', () => {
      const customConfig: ClientConfig = {
        ...mockConfig,
        options: {
          autoReportUsage: false,
          autoReportErrors: false,
          reportInterval: 60000,
          debug: true
        }
      };

      const customClient = new AiAdminClient(customConfig);
      expect(customClient).toBeDefined();
    });
  });

  describe('Lifecycle', () => {
    it('deve inicializar sem erro', async () => {
      // Mock dos métodos de conexão
      const mockConnect = jest.fn().mockResolvedValue(undefined);
      (client as any).connectionManager.connect = mockConnect;
      (client as any).telemetryReporter.start = jest.fn().mockResolvedValue(undefined);
      (client as any).errorReporter.start = jest.fn().mockResolvedValue(undefined);
      (client as any).telemetryReporter.setConnectionManager = jest.fn();
      (client as any).errorReporter.setConnectionManager = jest.fn();

      await expect(client.initialize()).resolves.not.toThrow();
      expect(mockConnect).toHaveBeenCalled();
    });

    it('deve fazer shutdown corretamente', async () => {
      const mockStop = jest.fn().mockResolvedValue(undefined);
      const mockDisconnect = jest.fn().mockResolvedValue(undefined);
      
      (client as any).telemetryReporter.stop = mockStop;
      (client as any).errorReporter.stop = mockStop;
      (client as any).connectionManager.disconnect = mockDisconnect;

      await expect(client.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Gestão de Sessões', () => {
    beforeEach(() => {
      // Mock para cliente inicializado
      (client as any).isInitialized = true;
      (client as any).connectionManager.validateUser = jest.fn().mockResolvedValue({
        success: true,
        data: { permissions: ['read', 'write'] }
      });
    });

    it('deve criar sessão de usuário', async () => {
      const session = await client.createUserSession('user123', 'tenant456');
      
      expect(session).toBeDefined();
      expect(session.userId).toBe('user123');
      expect(session.tenantId).toBe('tenant456');
      expect(session.sessionId).toBeDefined();
    });

    it('deve obter sessões ativas', async () => {
      await client.createUserSession('user1', 'tenant1');
      await client.createUserSession('user2', 'tenant2');
      
      const sessions = client.getActiveSessions();
      expect(sessions).toHaveLength(2);
    });

    it('deve encerrar sessão', async () => {
      const session = await client.createUserSession('user123', 'tenant456');
      await client.endUserSession(session.sessionId);
      
      const sessions = client.getActiveSessions();
      expect(sessions).toHaveLength(0);
    });
  });

  describe('Relatórios', () => {
    beforeEach(() => {
      (client as any).isInitialized = true;
    });

    it('deve reportar uso', async () => {
      const session = { sessionId: 'test-session', userId: 'user1', tenantId: 'tenant1' };
      (client as any).activeSessions.set('test-session', session);
      
      const mockReportUsage = jest.fn().mockResolvedValue(undefined);
      (client as any).telemetryReporter.reportUsage = mockReportUsage;

      await client.reportUsage({
        sessionId: 'test-session',
        userId: 'user1',
        tenantId: 'tenant1',
        action: 'chat',
        tokensUsed: 100
      });

      expect(mockReportUsage).toHaveBeenCalled();
    });

    it('deve reportar erro', async () => {
      const mockReportError = jest.fn().mockResolvedValue(undefined);
      (client as any).errorReporter.reportError = mockReportError;

      await client.reportError({
        error: 'Test error',
        errorCode: 'TEST_ERROR'
      });

      expect(mockReportError).toHaveBeenCalled();
    });
  });

  describe('Status e Monitoramento', () => {
    it('deve obter status da conexão', async () => {
      const mockStatus = {
        connected: true,
        authenticated: true,
        lastPing: Date.now()
      };

      (client as any).connectionManager.getStatus = jest.fn().mockReturnValue(mockStatus);

      const status = await client.getConnectionStatus();
      expect(status).toEqual(mockStatus);
    });

    it('deve obter estatísticas de uso', async () => {
      const mockStats = {
        local: { totalUsage: 10, totalTokens: 1000 }
      };

      (client as any).telemetryReporter.getStats = jest.fn().mockResolvedValue(mockStats);

      const stats = await client.getUsageStats();
      expect(stats).toEqual(mockStats);
    });
  });
}); 