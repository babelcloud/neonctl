import { vi, describe, it, expect, beforeEach } from 'vitest';
import chalk from 'chalk';
import { Api } from '@neondatabase/api-client';
import { log } from '../log';
import { parseSchemaDiffParams } from './schema_diff';

vi.mock('chalk', () => ({
  default: {
    green: vi.fn((str) => `green(${str})`),
    red: vi.fn((str) => `red(${str})`),
    yellow: vi.fn((str) => `yellow(${str})`),
    magenta: vi.fn((str) => `magenta(${str})`),
  },
}));

vi.mock('../log', () => ({
  log: {
    info: vi.fn(),
  },
}));

vi.mock('../pkg', () => ({
  default: {
    version: '1.0.0',
  },
}));

vi.mock('../analytics', () => ({
  sendError: vi.fn(),
  trackEvent: vi.fn(),
}));

describe('schema_diff', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('parseSchemaDiffParams', () => {
    const mockApiClient = {
      listProjectBranches: vi.fn(),
    } as unknown as Api<unknown>;

    it('should use compareSource when baseBranch is provided', async () => {
      const props = {
        apiClient: mockApiClient,
        projectId: 'project1',
        baseBranch: 'main',
        compareSource: 'feature',
        branch: 'dev',
        apiKey: 'test-key',
        apiHost: 'test-host',
        output: 'json' as const,
        contextFile: 'test-context',
        database: 'test-db',
      };

      const result = await parseSchemaDiffParams(props);
      expect(result).toEqual(props);
    });

    it('should use branch as baseBranch when only compareSource is provided', async () => {
      const props = {
        apiClient: mockApiClient,
        projectId: 'project1',
        compareSource: 'feature',
        branch: 'main',
        apiKey: 'test-key',
        apiHost: 'test-host',
        output: 'json' as const,
        contextFile: 'test-context',
        database: 'test-db',
      };

      const result = await parseSchemaDiffParams(props);
      expect(result).toEqual(props);
    });

    it('should compare with parent when no branches are specified and context branch has parent', async () => {
      const props = {
        apiClient: mockApiClient,
        projectId: 'project1',
        branch: 'feature',
        apiKey: 'test-key',
        apiHost: 'test-host',
        output: 'json' as const,
        contextFile: 'test-context',
        database: 'test-db',
        compareSource: '',
      };

      vi.mocked(mockApiClient.listProjectBranches).mockResolvedValue({
        data: {
          branches: [{ id: 'feature', name: 'feature', parent_id: 'main' }],
        },
      } as any);

      const result = await parseSchemaDiffParams(props);
      expect(result).toEqual({
        ...props,
        compareSource: '^parent',
      });
      expect(log.info).toHaveBeenCalledWith(
        "No branches specified. Comparing your context branch 'feature' with its parent",
      );
    });

    it('should throw error when no branches are specified and context branch has no parent', async () => {
      const props = {
        apiClient: mockApiClient,
        projectId: 'project1',
        branch: 'main',
        apiKey: 'test-key',
        apiHost: 'test-host',
        output: 'json' as const,
        contextFile: 'test-context',
        database: 'test-db',
        compareSource: '',
      };

      vi.mocked(mockApiClient.listProjectBranches).mockResolvedValue({
        data: {
          branches: [{ id: 'main', name: 'main', parent_id: undefined }],
        },
      } as any);

      await expect(parseSchemaDiffParams(props)).rejects.toThrow(
        'No branch specified. Your context branch (main) has no parent, so no comparison is possible.',
      );
    });

    it('should compare default branch with its parent when no branch is specified', async () => {
      const props = {
        apiClient: mockApiClient,
        projectId: 'project1',
        apiKey: 'test-key',
        apiHost: 'test-host',
        output: 'json' as const,
        contextFile: 'test-context',
        database: 'test-db',
        compareSource: '',
        branch: '',
      };

      vi.mocked(mockApiClient.listProjectBranches).mockResolvedValue({
        data: {
          branches: [
            { id: 'main', name: 'main', default: true, parent_id: 'parent' },
          ],
        },
      } as any);

      const result = await parseSchemaDiffParams(props);
      expect(result).toEqual({
        ...props,
        compareSource: '^parent',
      });
      expect(log.info).toHaveBeenCalledWith(
        'No branches specified. Comparing default branch with its parent',
      );
    });

    it('should throw error when no branch is specified and default branch has no parent', async () => {
      const props = {
        apiClient: mockApiClient,
        projectId: 'project1',
        apiKey: 'test-key',
        apiHost: 'test-host',
        output: 'json' as const,
        contextFile: 'test-context',
        database: 'test-db',
        compareSource: '',
        branch: '',
      };

      vi.mocked(mockApiClient.listProjectBranches).mockResolvedValue({
        data: {
          branches: [
            { id: 'main', name: 'main', default: true, parent_id: undefined },
          ],
        },
      } as any);

      await expect(parseSchemaDiffParams(props)).rejects.toThrow(
        'No branch specified. Include a base branch or add a set-context branch to continue. Your default branch has no parent, so no comparison is possible.',
      );
    });
  });
});