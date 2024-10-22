import { vi, describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { TokenSet } from 'openid-client';
import { Api } from '@neondatabase/api-client';
import * as auth from '../auth.js';
import * as log from '../log.js';
import * as api from '../api.js';
import * as env from '../env.js';
import { CREDENTIALS_FILE } from '../config.js';
import { authFlow, ensureAuth } from './auth';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

vi.mock('../auth.js', () => ({
  auth: vi.fn(),
  refreshToken: vi.fn(),
}));

vi.mock('../log.js', () => ({
  log: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../api.js', () => ({
  getApiClient: vi.fn(),
}));

vi.mock('../env.js', () => ({
  isCi: vi.fn(),
}));

describe('auth', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('authFlow', () => {
    it('should throw an error when running in CI without forceAuth', async () => {
      vi.mocked(env.isCi).mockReturnValue(true);
      await expect(
        authFlow({
          configDir: '',
          oauthHost: '',
          clientId: '',
          apiHost: '',
          forceAuth: false,
          _: [],
        }),
      ).rejects.toThrow('Cannot run interactive auth in CI');
    });

    it('should complete auth flow successfully', async () => {
      const mockTokenSet = new TokenSet({ access_token: 'mock_access_token' });
      vi.mocked(auth.auth).mockResolvedValue(mockTokenSet);
      vi.mocked(api.getApiClient).mockReturnValue({
        getCurrentUserInfo: vi
          .fn()
          .mockResolvedValue({ data: { id: 'user_id' } }),
      } as unknown as Api<unknown>);

      const result = await authFlow({
        configDir: '/mock/path',
        oauthHost: 'mock_host',
        clientId: 'mock_client',
        apiHost: 'mock_api_host',
        forceAuth: true,
        _: [],
      });

      expect(result).toBe('mock_access_token');
      expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
        '/mock/path/credentials.json',
        expect.any(String),
        { mode: 0o700 },
      );
      expect(log.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Saved credentials'),
      );
      expect(log.log.info).toHaveBeenCalledWith('Auth complete');
    });
  });

  describe('ensureAuth', () => {
    it('should return early if help is true', async () => {
      const props = {
        apiKey: '',
        apiClient: {} as Api<unknown>,
        help: true,
        _: [],
        configDir: '',
        oauthHost: '',
        clientId: '',
        apiHost: '',
        forceAuth: false,
      };
      await ensureAuth(props);
      expect(api.getApiClient).not.toHaveBeenCalled();
    });

    it('should use existing apiKey if provided', async () => {
      const props = {
        apiKey: 'existing_key',
        apiClient: {} as Api<unknown>,
        help: false,
        _: ['command'],
        configDir: '',
        oauthHost: '',
        clientId: '',
        apiHost: 'mock_api_host',
        forceAuth: false,
      };
      await ensureAuth(props);
      expect(api.getApiClient).toHaveBeenCalledWith({
        apiKey: 'existing_key',
        apiHost: 'mock_api_host',
      });
    });

    it('should refresh token if expired', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          access_token: 'old_token',
          refresh_token: 'refresh_token',
          expires_at: Date.now() - 1000, // Expired token
        }),
      );
      const mockRefreshedTokenSet = new TokenSet({ access_token: 'new_token' });
      vi.mocked(auth.refreshToken).mockResolvedValue(mockRefreshedTokenSet);
      vi.mocked(api.getApiClient).mockReturnValue({
        getCurrentUserInfo: vi
          .fn()
          .mockResolvedValue({ data: { id: 'user_id' } }),
      } as unknown as Api<unknown>);

      // Mock TokenSet.expired() to return true
      TokenSet.prototype.expired = vi.fn().mockReturnValue(true);

      const props = {
        apiKey: '',
        apiClient: {} as Api<unknown>,
        help: false,
        _: ['command'],
        configDir: '/mock/path',
        oauthHost: 'mock_host',
        clientId: 'mock_client',
        apiHost: 'mock_api_host',
        forceAuth: false,
      };
      await ensureAuth(props);

      expect(auth.refreshToken).toHaveBeenCalled();
      expect(api.getApiClient).toHaveBeenCalledWith({
        apiKey: 'new_token',
        apiHost: 'mock_api_host',
      });
      expect(vi.mocked(writeFileSync)).toHaveBeenCalled();
    });

    it('should use existing valid token', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          access_token: 'valid_token',
          expires_at: Date.now() + 3600000, // Valid token
        }),
      );

      // Mock TokenSet.expired() to return false
      TokenSet.prototype.expired = vi.fn().mockReturnValue(false);

      const props = {
        apiKey: '',
        apiClient: {} as Api<unknown>,
        help: false,
        _: ['command'],
        configDir: '/mock/path',
        oauthHost: 'mock_host',
        clientId: 'mock_client',
        apiHost: 'mock_api_host',
        forceAuth: false,
      };
      await ensureAuth(props);

      expect(api.getApiClient).toHaveBeenCalledWith({
        apiKey: 'valid_token',
        apiHost: 'mock_api_host',
      });
    });

    it('should initiate auth flow if no credentials exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(auth.auth).mockResolvedValue(
        new TokenSet({ access_token: 'new_token' }),
      );
      vi.mocked(api.getApiClient).mockReturnValue({
        getCurrentUserInfo: vi
          .fn()
          .mockResolvedValue({ data: { id: 'user_id' } }),
      } as unknown as Api<unknown>);

      const props = {
        apiKey: '',
        apiClient: {} as Api<unknown>,
        help: false,
        _: ['command'],
        configDir: '/mock/path',
        oauthHost: 'mock_host',
        clientId: 'mock_client',
        apiHost: 'mock_api_host',
        forceAuth: false,
      };
      await ensureAuth(props);

      expect(auth.auth).toHaveBeenCalled();
      expect(api.getApiClient).toHaveBeenCalledWith({
        apiKey: 'new_token',
        apiHost: 'mock_api_host',
      });
    });
  });
});