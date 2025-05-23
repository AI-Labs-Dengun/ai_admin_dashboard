import { createBotConnection } from '../index';
import axios from 'axios';
import '@types/jest';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BotConnection', () => {
  const mockConfig = {
    baseUrl: 'https://test-dashboard.com',
    token: 'test-token',
    userId: 'test-user',
    tenantId: 'test-tenant'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a connection instance', () => {
    const connection = createBotConnection(mockConfig);
    expect(connection).toBeDefined();
  });

  it('should handle ping correctly', async () => {
    const connection = createBotConnection(mockConfig);
    mockedAxios.create.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} })
    } as any);

    const result = await connection.ping();
    expect(result).toBe(true);
  });

  it('should handle token refresh', async () => {
    const connection = createBotConnection(mockConfig);
    const mockTokenResponse = {
      token: 'new-token',
      expiresAt: Date.now() + 3600000
    };

    mockedAxios.create.mockReturnValue({
      post: jest.fn().mockResolvedValue({ data: mockTokenResponse })
    } as any);

    const result = await connection.getBotAccess();
    expect(result).toBeDefined();
  });
}); 