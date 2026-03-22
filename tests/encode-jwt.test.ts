// tests/encode-jwt.test.ts
import { describe, it, expect } from 'vitest';
import { decodeJwt } from '../src/engines/encode-jwt.js';

describe('encode-jwt', () => {
  const validJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImV4cCI6MTcxMTMyOTYwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  it('decodes a valid JWT', () => {
    const result = decodeJwt(validJwt);
    expect(result.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(result.payload).toEqual({ sub: 'user_123', exp: 1711329600 });
    expect(result.signature).toBe('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  });

  it('throws on JWT with wrong segment count (2 segments)', () => {
    expect(() => decodeJwt('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ')).toThrow(
      /3 dot-separated segments/
    );
  });

  it('throws on JWT with wrong segment count (4 segments)', () => {
    expect(() => decodeJwt('a.b.c.d')).toThrow(/3 dot-separated segments/);
  });

  it('throws on invalid JSON in header', () => {
    expect(() => decodeJwt('bm90IGpzb24.eyJzdWIiOiIxMjMifQ.sig')).toThrow(/header/i);
  });

  it('throws on invalid JSON in payload', () => {
    expect(() => decodeJwt('eyJhbGciOiJIUzI1NiJ9.bm90IGpzb24.sig')).toThrow(/payload/i);
  });

  it('handles empty string', () => {
    expect(() => decodeJwt('')).toThrow();
  });
});
