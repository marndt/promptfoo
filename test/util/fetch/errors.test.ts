import { describe, expect, it } from 'vitest';
import {
  formatConnectionErrorMessage,
  isConnectionRefusedError,
  type SystemError,
} from '../../../src/util/fetch/errors';

describe('isConnectionRefusedError', () => {
  it('returns false for null or undefined', () => {
    expect(isConnectionRefusedError(null)).toBe(false);
    expect(isConnectionRefusedError(undefined)).toBe(false);
  });

  it('returns false for non-object values', () => {
    expect(isConnectionRefusedError('econnrefused')).toBe(false);
    expect(isConnectionRefusedError(42)).toBe(false);
  });

  it('returns true when error.code is ECONNREFUSED', () => {
    const err = new Error('connect ECONNREFUSED') as SystemError;
    err.code = 'ECONNREFUSED';
    expect(isConnectionRefusedError(err)).toBe(true);
  });

  it('returns true when error.code is ENOTFOUND', () => {
    const err = new Error('getaddrinfo ENOTFOUND') as SystemError;
    err.code = 'ENOTFOUND';
    expect(isConnectionRefusedError(err)).toBe(true);
  });

  it('returns true when error.cause.code is ECONNREFUSED', () => {
    const err = new Error('fetch failed');
    (err as unknown as { cause?: SystemError }).cause = {
      code: 'ECONNREFUSED',
    } as SystemError;
    expect(isConnectionRefusedError(err)).toBe(true);
  });

  it('returns true when error.cause.code is ENOTFOUND', () => {
    const err = new Error('fetch failed');
    (err as unknown as { cause?: SystemError }).cause = {
      code: 'ENOTFOUND',
    } as SystemError;
    expect(isConnectionRefusedError(err)).toBe(true);
  });

  it('returns true when message includes econnrefused', () => {
    expect(isConnectionRefusedError(new Error('connect ECONNREFUSED 127.0.0.1'))).toBe(true);
  });

  it('returns true when message includes enotfound', () => {
    expect(isConnectionRefusedError(new Error('getaddrinfo ENOTFOUND api.example.com'))).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isConnectionRefusedError(new Error('Something went wrong'))).toBe(false);
    expect(isConnectionRefusedError(new Error('ETIMEDOUT'))).toBe(false);
  });
});

describe('formatConnectionErrorMessage', () => {
  it('returns null when error is not connection-refused', () => {
    expect(formatConnectionErrorMessage(new Error('Something else'))).toBe(null);
  });

  it('returns "Is the server running?" message for ECONNREFUSED', () => {
    const err = new Error('fetch failed');
    (err as unknown as { cause?: SystemError }).cause = { code: 'ECONNREFUSED' } as SystemError;
    const msg = formatConnectionErrorMessage(err);
    expect(msg).toContain('Could not reach the server');
    expect(msg).toContain('Is it running?');
  });

  it('returns "Check the URL and that the host is reachable" for ENOTFOUND', () => {
    const err = new Error('fetch failed');
    (err as unknown as { cause?: SystemError }).cause = { code: 'ENOTFOUND' } as SystemError;
    const msg = formatConnectionErrorMessage(err);
    expect(msg).toContain('Could not reach the server');
    expect(msg).toContain('Check the URL and that the host is reachable');
  });
});
