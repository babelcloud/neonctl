import { describe, it, expect } from 'vitest';
import { matchErrorCode } from './errors';

describe('matchErrorCode', () => {
  it('should return UNKNOWN_COMMAND for unknown command message', () => {
    const result = matchErrorCode('Unknown command: test');
    expect(result).toBe('UNKNOWN_COMMAND');
  });

  it('should return MISSING_ARGUMENT for missing argument message', () => {
    const result = matchErrorCode('Missing required argument: name');
    expect(result).toBe('MISSING_ARGUMENT');
  });

  it('should return AUTH_BROWSER_FAILED for failed browser auth message', () => {
    const result = matchErrorCode(
      'Failed to open web browser. Please try again.',
    );
    expect(result).toBe('AUTH_BROWSER_FAILED');
  });

  it('should return UNKNOWN_ERROR for an unknown message', () => {
    const result = matchErrorCode('Some random error message');
    expect(result).toBe('UNKNOWN_ERROR');
  });

  it('should return UNKNOWN_ERROR when no message is provided', () => {
    const result = matchErrorCode();
    expect(result).toBe('UNKNOWN_ERROR');
  });
});