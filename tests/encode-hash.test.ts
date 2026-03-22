// tests/encode-hash.test.ts
import { describe, it, expect } from 'vitest';
import { computeHash, computeHmac } from '../src/engines/encode-hash.js';

describe('encode-hash', () => {
  describe('computeHash', () => {
    it('SHA-256 of "hello world"', () => {
      const result = computeHash('sha256', 'hello world', 'utf8', 'hex');
      expect(result).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    });

    it('SHA-256 of empty string', () => {
      const result = computeHash('sha256', '', 'utf8', 'hex');
      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('SHA-512 of "hello world"', () => {
      const result = computeHash('sha512', 'hello world', 'utf8', 'hex');
      expect(result).toHaveLength(128);
      expect(result).toBe(
        '309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f',
      );
    });

    it('SHA-1 of "hello world"', () => {
      const result = computeHash('sha1', 'hello world', 'utf8', 'hex');
      expect(result).toBe('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed');
    });

    it('MD5 of "hello world"', () => {
      const result = computeHash('md5', 'hello world', 'utf8', 'hex');
      expect(result).toBe('5eb63bbbe01eeed093cb22bb8f5acdc3');
    });

    it('accepts hex input_encoding', () => {
      const result = computeHash('sha256', '4869', 'hex', 'hex');
      const expected = computeHash('sha256', 'Hi', 'utf8', 'hex');
      expect(result).toBe(expected);
    });

    it('accepts base64 input_encoding', () => {
      const result = computeHash('sha256', 'SGk=', 'base64', 'hex');
      const expected = computeHash('sha256', 'Hi', 'utf8', 'hex');
      expect(result).toBe(expected);
    });

    it('supports base64 output_encoding', () => {
      const hex = computeHash('sha256', 'hello world', 'utf8', 'hex');
      const b64 = computeHash('sha256', 'hello world', 'utf8', 'base64');
      expect(Buffer.from(hex, 'hex').toString('base64')).toBe(b64);
    });

    it('handles UTF-8 multibyte characters', () => {
      const hash1 = computeHash('sha256', 'cafe', 'utf8', 'hex');
      const hash2 = computeHash('sha256', 'caf\u00e9', 'utf8', 'hex');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('computeHmac', () => {
    it('HMAC-SHA256 with known key', () => {
      const result = computeHmac('sha256', 'hello world', 'utf8', 'secret', 'utf8', 'hex');
      expect(result).toHaveLength(64);
      const result2 = computeHmac('sha256', 'hello world', 'utf8', 'secret', 'utf8', 'hex');
      expect(result).toBe(result2);
    });

    it('HMAC-SHA512 produces 128-char hex', () => {
      const result = computeHmac('sha512', 'data', 'utf8', 'key', 'utf8', 'hex');
      expect(result).toHaveLength(128);
    });

    it('supports hex key_encoding', () => {
      const withUtf8 = computeHmac('sha256', 'data', 'utf8', 'key', 'utf8', 'hex');
      const withHex = computeHmac('sha256', 'data', 'utf8', '6b6579', 'hex', 'hex');
      expect(withUtf8).toBe(withHex);
    });

    it('supports base64 output_encoding', () => {
      const hex = computeHmac('sha256', 'data', 'utf8', 'key', 'utf8', 'hex');
      const b64 = computeHmac('sha256', 'data', 'utf8', 'key', 'utf8', 'base64');
      expect(Buffer.from(hex, 'hex').toString('base64')).toBe(b64);
    });
  });
});
