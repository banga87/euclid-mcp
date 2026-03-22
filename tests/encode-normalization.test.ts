// tests/encode-normalization.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeEncodeInput } from '../src/normalization.js';

describe('normalizeEncodeInput', () => {
  it('adds padding to unpadded Base64 for base64_decode', () => {
    const result = normalizeEncodeInput('base64_decode', 'aGVsbG8');
    expect(result.value).toBe('aGVsbG8=');
    expect(result.wasTransformed).toBe(true);
    expect(result.original).toBe('aGVsbG8');
  });

  it('does not add padding to already-padded Base64', () => {
    const result = normalizeEncodeInput('base64_decode', 'aGVsbG8=');
    expect(result.value).toBe('aGVsbG8=');
    expect(result.wasTransformed).toBe(false);
  });

  it('strips 0x prefix from hex for hex_decode', () => {
    const result = normalizeEncodeInput('hex_decode', '0x48656c6c6f');
    expect(result.value).toBe('48656c6c6f');
    expect(result.wasTransformed).toBe(true);
  });

  it('strips 0X prefix (uppercase) from hex', () => {
    const result = normalizeEncodeInput('hex_decode', '0X48656c6c6f');
    expect(result.value).toBe('48656c6c6f');
    expect(result.wasTransformed).toBe(true);
  });

  it('strips spaces from hex input', () => {
    const result = normalizeEncodeInput('hex_decode', '48 65 6c 6c 6f');
    expect(result.value).toBe('48656c6c6f');
    expect(result.wasTransformed).toBe(true);
  });

  it('strips colons from hex input', () => {
    const result = normalizeEncodeInput('hex_decode', '48:65:6c:6c:6f');
    expect(result.value).toBe('48656c6c6f');
    expect(result.wasTransformed).toBe(true);
  });

  it('strips 0x prefix for hash operations with hex input_encoding', () => {
    const result = normalizeEncodeInput('sha256', '0xabcdef', 'hex');
    expect(result.value).toBe('abcdef');
    expect(result.wasTransformed).toBe(true);
  });

  it('does NOT strip 0x prefix for hash operations with utf8 input_encoding', () => {
    const result = normalizeEncodeInput('sha256', '0xabcdef', 'utf8');
    expect(result.value).toBe('0xabcdef');
    expect(result.wasTransformed).toBe(false);
  });

  it('does NOT strip 0x prefix for hash operations with no input_encoding', () => {
    const result = normalizeEncodeInput('sha256', '0xabcdef');
    expect(result.value).toBe('0xabcdef');
    expect(result.wasTransformed).toBe(false);
  });

  it('passes through non-matching operations unchanged', () => {
    const result = normalizeEncodeInput('url_encode', 'hello world');
    expect(result.value).toBe('hello world');
    expect(result.wasTransformed).toBe(false);
  });

  it('handles empty string', () => {
    const result = normalizeEncodeInput('base64_decode', '');
    expect(result.value).toBe('');
    expect(result.wasTransformed).toBe(false);
  });
});
