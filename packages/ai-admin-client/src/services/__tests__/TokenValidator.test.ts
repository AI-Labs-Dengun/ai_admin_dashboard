import { TokenValidator } from '../TokenValidator';
import { PublicKeyManager } from '../PublicKeyManager';
import { jwtVerify } from 'jose';

jest.mock('../PublicKeyManager');
jest.mock('jose');

describe('TokenValidator', () => {
  let tokenValidator: TokenValidator;
  let mockPublicKeyManager: jest.Mocked<PublicKeyManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPublicKeyManager = PublicKeyManager.getInstance() as jest.Mocked<PublicKeyManager>;
    tokenValidator = TokenValidator.getInstance();
  });

  describe('validateToken', () => {
    const mockToken = 'mock.token.here';
    const mockPublicKey = 'mock-public-key';
    const mockKid = 'mock-kid';
    const mockAlgorithm = 'RS256';

    beforeEach(() => {
      process.env.DASHBOARD_URL = 'http://localhost:3000';
      process.env.BOT_NAME = 'test-bot';
    });

    it('deve validar token localmente com sucesso', async () => {
      const mockHeader = { kid: mockKid };
      const mockPayload = { sub: 'test-bot', iat: Date.now() };

      jest.spyOn(Buffer, 'from').mockImplementation((str: string) => {
        if (str === mockKid) return Buffer.from(JSON.stringify(mockHeader));
        return Buffer.from(str);
      });

      mockPublicKeyManager.getPublicKey.mockResolvedValue({
        publicKey: mockPublicKey,
        algorithm: mockAlgorithm
      });

      mockPublicKeyManager.getPublicKeyObject.mockReturnValue(mockPublicKey);

      (jwtVerify as jest.Mock).mockResolvedValue({ payload: mockPayload });

      const result = await tokenValidator.validateToken(mockToken);

      expect(result.valid).toBe(true);
      expect(result.payload).toEqual(mockPayload);
      expect(mockPublicKeyManager.getPublicKey).toHaveBeenCalledWith(
        process.env.DASHBOARD_URL,
        mockKid
      );
    });

    it('deve validar token remotamente com sucesso', async () => {
      const mockResponse = {
        valid: true,
        payload: { sub: 'test-bot' }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await tokenValidator.validateToken(mockToken, {
        remote: true,
        dashboardUrl: 'http://localhost:3000'
      });

      expect(result.valid).toBe(true);
      expect(result.payload).toEqual(mockResponse.payload);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/bots/validate-token',
        expect.any(Object)
      );
    });

    it('deve retornar erro quando token não contém kid', async () => {
      const mockHeader = {};
      jest.spyOn(Buffer, 'from').mockImplementation(() => Buffer.from(JSON.stringify(mockHeader)));

      const result = await tokenValidator.validateToken(mockToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token não contém kid no header');
    });

    it('deve retornar erro quando validação remota falha', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Token inválido' })
      });

      const result = await tokenValidator.validateToken(mockToken, {
        remote: true,
        dashboardUrl: 'http://localhost:3000'
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token inválido');
    });
  });

  describe('validateTokenWithJWKS', () => {
    it('deve validar token com JWKS com sucesso', async () => {
      const mockToken = 'mock.token.here';
      const mockPayload = { sub: 'test-bot' };
      const mockJwksUrl = 'http://localhost:3000/.well-known/jwks.json';

      (jwtVerify as jest.Mock).mockResolvedValue({ payload: mockPayload });

      const result = await tokenValidator.validateTokenWithJWKS(mockToken, mockJwksUrl);

      expect(result.valid).toBe(true);
      expect(result.payload).toEqual(mockPayload);
      expect(jwtVerify).toHaveBeenCalledWith(
        mockToken,
        expect.any(Object),
        expect.objectContaining({
          issuer: process.env.DASHBOARD_URL,
          audience: process.env.BOT_NAME
        })
      );
    });

    it('deve retornar erro quando validação com JWKS falha', async () => {
      const mockToken = 'mock.token.here';
      const mockJwksUrl = 'http://localhost:3000/.well-known/jwks.json';

      (jwtVerify as jest.Mock).mockRejectedValue(new Error('Token inválido'));

      const result = await tokenValidator.validateTokenWithJWKS(mockToken, mockJwksUrl);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token inválido');
    });
  });
}); 