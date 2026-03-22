// tests/encode-codec.test.ts
import { describe, it, expect } from 'vitest';
import {
  encodeBase64,
  decodeBase64,
  encodeBase64url,
  decodeBase64url,
  encodeHex,
  decodeHex,
  encodeUrl,
  decodeUrl,
  encodeHtml,
  decodeHtml,
} from '../src/engines/encode-codec.js';

describe('encode-codec', () => {
  // --- Base64 ---
  describe('base64', () => {
    it('encodes a UTF-8 string to Base64', () => {
      expect(encodeBase64('hello world', 'utf8')).toBe('aGVsbG8gd29ybGQ=');
    });

    it('encodes hex-encoded bytes to Base64', () => {
      expect(encodeBase64('48656c6c6f', 'hex')).toBe('SGVsbG8=');
    });

    it('encodes base64-encoded bytes (re-encodes)', () => {
      expect(encodeBase64('SGVsbG8=', 'base64')).toBe('SGVsbG8=');
    });

    it('decodes Base64 to UTF-8 string', () => {
      const result = decodeBase64('aGVsbG8gd29ybGQ=');
      expect(result.result).toBe('hello world');
      expect(result.isBinary).toBe(false);
    });

    it('decodes unpadded Base64', () => {
      const result = decodeBase64('aGVsbG8');
      expect(result.result).toBe('hello');
      expect(result.isBinary).toBe(false);
    });

    it('returns hex for non-UTF-8 binary output', () => {
      // PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
      const b64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64');
      const result = decodeBase64(b64);
      expect(result.result).toBe('89504e470d0a1a0a');
      expect(result.isBinary).toBe(true);
    });

    it('handles empty string', () => {
      expect(encodeBase64('', 'utf8')).toBe('');
      const result = decodeBase64('');
      expect(result.result).toBe('');
      expect(result.isBinary).toBe(false);
    });

    it('throws on invalid Base64 characters', () => {
      expect(() => decodeBase64('not valid base64!!!')).toThrow();
    });
  });

  // --- Base64url ---
  describe('base64url', () => {
    it('encodes to URL-safe Base64 without padding', () => {
      const result = encodeBase64url('subjects?_d', 'utf8');
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });

    it('decodes Base64url to UTF-8', () => {
      const result = decodeBase64url('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(result.result).toBe('{"alg":"HS256","typ":"JWT"}');
      expect(result.isBinary).toBe(false);
    });
  });

  // --- Hex ---
  describe('hex', () => {
    it('encodes a UTF-8 string to lowercase hex', () => {
      expect(encodeHex('hello', 'utf8')).toBe('68656c6c6f');
    });

    it('decodes hex to UTF-8', () => {
      const result = decodeHex('68656c6c6f');
      expect(result.result).toBe('hello');
      expect(result.isBinary).toBe(false);
    });

    it('is case-insensitive', () => {
      const result = decodeHex('48656C6C6F');
      expect(result.result).toBe('Hello');
    });

    it('throws on odd-length hex', () => {
      expect(() => decodeHex('48656')).toThrow();
    });

    it('throws on invalid hex characters', () => {
      expect(() => decodeHex('xyz123')).toThrow();
    });
  });

  // --- URL ---
  describe('url', () => {
    it('percent-encodes special characters per RFC 3986', () => {
      const result = encodeUrl('hello world&foo=bar');
      expect(result).toBe('hello%20world%26foo%3Dbar');
    });

    it('encodes RFC 3986 reserved chars that encodeURIComponent misses', () => {
      const result = encodeUrl("test!'()*");
      expect(result).toBe('test%21%27%28%29%2A');
    });

    it('decodes percent-encoded string', () => {
      expect(decodeUrl('hello%20world%26foo%3Dbar')).toBe('hello world&foo=bar');
    });

    it('handles Unicode', () => {
      const encoded = encodeUrl('caf\u00e9');
      expect(decodeUrl(encoded)).toBe('caf\u00e9');
    });
  });

  // --- HTML ---
  describe('html', () => {
    it('encodes special chars to HTML entities', () => {
      const result = encodeHtml('<script>alert("xss")</script>');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
    });

    it('decodes named entities', () => {
      expect(decodeHtml('&amp; &lt; &gt; &quot;')).toBe('& < > "');
    });

    it('decodes numeric entities', () => {
      expect(decodeHtml('&#8212;')).toBe('\u2014'); // em dash
    });

    it('decodes hex entities', () => {
      expect(decodeHtml('&#x2014;')).toBe('\u2014'); // em dash
    });

    it('handles empty string', () => {
      expect(encodeHtml('')).toBe('');
      expect(decodeHtml('')).toBe('');
    });
  });
});
