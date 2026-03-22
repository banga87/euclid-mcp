// tests/encode.test.ts
import { describe, it, expect } from 'vitest';
import { encodeTool } from '../src/tools/encode.js';

// Helper to call handler and parse the JSON response
async function call(args: Record<string, unknown>) {
  const response = await encodeTool.handler(args as Parameters<typeof encodeTool.handler>[0]);
  return {
    ...response,
    parsed: JSON.parse(response.content[0].text),
  };
}

describe('encodeTool', () => {
  it('has correct tool name', () => {
    expect(encodeTool.name).toBe('encode');
  });

  it('has a description', () => {
    expect(encodeTool.description).toBeTruthy();
  });

  it('has an inputSchema', () => {
    expect(encodeTool.inputSchema).toBeDefined();
  });

  // --- Codec operations via handler ---
  describe('codec operations', () => {
    it('base64_encode', async () => {
      const { parsed } = await call({ operation: 'base64_encode', input: 'hello world' });
      expect(parsed.operation).toBe('base64_encode');
      expect(parsed.result).toBe('aGVsbG8gd29ybGQ=');
      expect(parsed.input_length).toBe(11);
      expect(parsed.output_length).toBe(16);
    });

    it('base64_decode', async () => {
      const { parsed } = await call({ operation: 'base64_decode', input: 'aGVsbG8gd29ybGQ=' });
      expect(parsed.result).toBe('hello world');
    });

    it('base64_decode with normalization (auto-padding)', async () => {
      const { parsed } = await call({ operation: 'base64_decode', input: 'aGVsbG8' });
      expect(parsed.result).toBe('hello');
      expect(parsed.note).toContain('Interpreted');
    });

    it('base64_decode binary output returns hex', async () => {
      const b64 = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64');
      const { parsed } = await call({ operation: 'base64_decode', input: b64 });
      expect(parsed.result).toBe('89504e47');
      expect(parsed.note).toContain('binary');
    });

    it('hex_encode', async () => {
      const { parsed } = await call({ operation: 'hex_encode', input: 'hello' });
      expect(parsed.result).toBe('68656c6c6f');
    });

    it('hex_decode', async () => {
      const { parsed } = await call({ operation: 'hex_decode', input: '68656c6c6f' });
      expect(parsed.result).toBe('hello');
    });

    it('hex_decode with normalization (0x prefix)', async () => {
      const { parsed } = await call({ operation: 'hex_decode', input: '0x68656c6c6f' });
      expect(parsed.result).toBe('hello');
      expect(parsed.note).toContain('Interpreted');
    });

    it('url_encode', async () => {
      const { parsed } = await call({ operation: 'url_encode', input: 'hello world' });
      expect(parsed.result).toBe('hello%20world');
    });

    it('url_decode', async () => {
      const { parsed } = await call({ operation: 'url_decode', input: 'hello%20world' });
      expect(parsed.result).toBe('hello world');
    });

    it('html_encode', async () => {
      const { parsed } = await call({ operation: 'html_encode', input: '<b>hi</b>' });
      expect(parsed.result).toContain('&lt;');
    });

    it('html_decode', async () => {
      const { parsed } = await call({ operation: 'html_decode', input: '&lt;b&gt;hi&lt;/b&gt;' });
      expect(parsed.result).toBe('<b>hi</b>');
    });
  });

  // --- Hash operations via handler ---
  describe('hash operations', () => {
    it('sha256', async () => {
      const { parsed } = await call({ operation: 'sha256', input: 'hello world' });
      expect(parsed.operation).toBe('sha256');
      expect(parsed.result).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
      expect(parsed.output_encoding).toBe('hex');
      expect(parsed.algorithm_note).toContain('256-bit');
    });

    it('sha256 with base64 output', async () => {
      const { parsed } = await call({ operation: 'sha256', input: 'hello world', output_encoding: 'base64' });
      expect(parsed.output_encoding).toBe('base64');
      expect(() => Buffer.from(parsed.result, 'base64')).not.toThrow();
    });

    it('md5 includes legacy note', async () => {
      const { parsed } = await call({ operation: 'md5', input: 'hello world' });
      expect(parsed.algorithm_note).toContain('not collision-resistant');
    });

    it('sha1 includes legacy note', async () => {
      const { parsed } = await call({ operation: 'sha1', input: 'hello world' });
      expect(parsed.algorithm_note).toContain('not collision-resistant');
    });

    it('sha512', async () => {
      const { parsed } = await call({ operation: 'sha512', input: 'hello world' });
      expect(parsed.result).toHaveLength(128);
    });
  });

  // --- HMAC ---
  describe('hmac', () => {
    it('computes HMAC-SHA256', async () => {
      const { parsed } = await call({
        operation: 'hmac',
        input: 'hello world',
        key: 'secret',
        algorithm: 'sha256',
      });
      expect(parsed.operation).toBe('hmac');
      expect(parsed.algorithm).toBe('sha256');
      expect(parsed.result).toHaveLength(64);
      expect(parsed.output_encoding).toBe('hex');
    });

    it('returns error when key is missing', async () => {
      const { parsed, isError } = await call({
        operation: 'hmac',
        input: 'data',
        algorithm: 'sha256',
      });
      expect(isError).toBe(true);
      expect(parsed.error).toContain('key');
    });

    it('returns error when algorithm is missing', async () => {
      const { parsed, isError } = await call({
        operation: 'hmac',
        input: 'data',
        key: 'secret',
      });
      expect(isError).toBe(true);
      expect(parsed.error).toContain('algorithm');
    });

    it('error does not leak key material', async () => {
      const secretKey = 'super_secret_key_12345';
      const { parsed } = await call({
        operation: 'hmac',
        input: 'data',
        key: secretKey,
      });
      expect(parsed.error).not.toContain(secretKey);
      expect(JSON.stringify(parsed)).not.toContain(secretKey);
    });
  });

  // --- JWT decode ---
  describe('jwt_decode', () => {
    const validJwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImV4cCI6MTcxMTMyOTYwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    it('decodes a valid JWT', async () => {
      const { parsed } = await call({ operation: 'jwt_decode', input: validJwt });
      expect(parsed.operation).toBe('jwt_decode');
      expect(parsed.header.alg).toBe('HS256');
      expect(parsed.payload.sub).toBe('user_123');
      expect(parsed.signature).toBeTruthy();
      expect(parsed.warning).toContain('without signature verification');
    });

    it('returns error for malformed JWT', async () => {
      const { parsed, isError } = await call({ operation: 'jwt_decode', input: 'not.a.jwt' });
      expect(isError).toBe(true);
      expect(parsed.error).toBeTruthy();
      expect(parsed.hint).toBeTruthy();
      expect(parsed.examples).toBeInstanceOf(Array);
    });
  });

  // --- Validation ---
  describe('validation', () => {
    it('rejects unknown operation', async () => {
      const { parsed, isError } = await call({ operation: 'unknown_op', input: 'test' });
      expect(isError).toBe(true);
      expect(parsed.error).toContain('operation');
    });

    it('rejects output_encoding on codec operations', async () => {
      const { parsed, isError } = await call({
        operation: 'base64_encode',
        input: 'hello',
        output_encoding: 'base64',
      });
      expect(isError).toBe(true);
      expect(parsed.error).toContain('output_encoding');
    });

    it('rejects input_encoding on decode operations', async () => {
      const { parsed, isError } = await call({
        operation: 'base64_decode',
        input: 'aGVsbG8=',
        input_encoding: 'hex',
      });
      expect(isError).toBe(true);
      expect(parsed.error).toContain('input_encoding');
    });

    it('rejects input_encoding on url_encode', async () => {
      const { parsed, isError } = await call({
        operation: 'url_encode',
        input: 'hello',
        input_encoding: 'hex',
      });
      expect(isError).toBe(true);
      expect(parsed.error).toContain('input_encoding');
    });

    it('rejects input_encoding on html_encode', async () => {
      const { parsed, isError } = await call({
        operation: 'html_encode',
        input: '<b>hi</b>',
        input_encoding: 'utf8',
      });
      expect(isError).toBe(true);
      expect(parsed.error).toContain('input_encoding');
    });

    it('rejects key on non-hmac operations', async () => {
      const { parsed, isError } = await call({
        operation: 'sha256',
        input: 'hello',
        key: 'secret',
      });
      expect(isError).toBe(true);
      expect(parsed.error).toContain('key');
    });

    it('rejects algorithm on non-hmac operations', async () => {
      const { parsed, isError } = await call({
        operation: 'sha256',
        input: 'hello',
        algorithm: 'sha256',
      });
      expect(isError).toBe(true);
      expect(parsed.error).toContain('algorithm');
    });

    it('rejects key_encoding on non-hmac operations', async () => {
      const { parsed, isError } = await call({
        operation: 'sha256',
        input: 'hello',
        key_encoding: 'hex',
      });
      expect(isError).toBe(true);
      expect(parsed.error).toContain('key_encoding');
    });

    it('rejects input over 1 MB', async () => {
      const bigInput = 'x'.repeat(1_048_577);
      const { parsed, isError } = await call({ operation: 'sha256', input: bigInput });
      expect(isError).toBe(true);
      expect(parsed.error).toContain('1 MB');
    });

    it('accepts empty string input', async () => {
      const { parsed, isError } = await call({ operation: 'sha256', input: '' });
      expect(isError).toBeUndefined();
      expect(parsed.result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('accepts input_encoding on base64_encode', async () => {
      const { parsed, isError } = await call({
        operation: 'base64_encode',
        input: '48656c6c6f',
        input_encoding: 'hex',
      });
      expect(isError).toBeUndefined();
      expect(parsed.result).toBe('SGVsbG8=');
    });
  });
});
