// src/engines/encode-codec.ts
import he from 'he';

export type InputEncoding = 'utf8' | 'hex' | 'base64';

export type DecodeResult = {
  result: string;
  isBinary: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toBuffer(input: string, encoding: InputEncoding): Buffer {
  return Buffer.from(input, encoding);
}

function isValidUtf8(buf: Buffer): boolean {
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    // Re-encode and compare to ensure round-trip fidelity
    return Buffer.from(decoded, 'utf8').equals(buf);
  } catch {
    return false;
  }
}

function decodeToString(buf: Buffer): DecodeResult {
  if (buf.length === 0) {
    return { result: '', isBinary: false };
  }
  if (isValidUtf8(buf)) {
    return { result: buf.toString('utf8'), isBinary: false };
  }
  return { result: buf.toString('hex'), isBinary: true };
}

function validateBase64(input: string): void {
  // Strip padding, then check for valid chars
  const stripped = input.replace(/=+$/, '');
  if (stripped.length > 0 && !/^[A-Za-z0-9+/]*$/.test(stripped)) {
    const badChar = stripped.match(/[^A-Za-z0-9+/]/);
    const pos = badChar ? stripped.indexOf(badChar[0]) : -1;
    throw new Error(
      `Invalid Base64 input: unexpected character '${badChar?.[0]}' at position ${pos}`,
    );
  }
}

function validateBase64url(input: string): void {
  const stripped = input.replace(/=+$/, '');
  if (stripped.length > 0 && !/^[A-Za-z0-9_-]*$/.test(stripped)) {
    const badChar = stripped.match(/[^A-Za-z0-9_-]/);
    const pos = badChar ? stripped.indexOf(badChar[0]) : -1;
    throw new Error(
      `Invalid Base64url input: unexpected character '${badChar?.[0]}' at position ${pos}`,
    );
  }
}

function validateHex(input: string): void {
  if (input.length % 2 !== 0) {
    throw new Error(
      `Invalid hex input: odd number of characters (${input.length}). Hex strings must have even length.`,
    );
  }
  if (!/^[0-9a-fA-F]*$/.test(input)) {
    const badChar = input.match(/[^0-9a-fA-F]/);
    throw new Error(`Invalid hex input: unexpected character '${badChar?.[0]}'`);
  }
}

// ---------------------------------------------------------------------------
// Base64 (RFC 4648)
// ---------------------------------------------------------------------------

export function encodeBase64(input: string, inputEncoding: InputEncoding): string {
  return toBuffer(input, inputEncoding).toString('base64');
}

export function decodeBase64(input: string): DecodeResult {
  validateBase64(input);
  const buf = Buffer.from(input, 'base64');
  return decodeToString(buf);
}

// ---------------------------------------------------------------------------
// Base64url (RFC 4648 Section 5)
// ---------------------------------------------------------------------------

export function encodeBase64url(input: string, inputEncoding: InputEncoding): string {
  return toBuffer(input, inputEncoding).toString('base64url');
}

export function decodeBase64url(input: string): DecodeResult {
  validateBase64url(input);
  const buf = Buffer.from(input, 'base64url');
  return decodeToString(buf);
}

// ---------------------------------------------------------------------------
// Hex
// ---------------------------------------------------------------------------

export function encodeHex(input: string, inputEncoding: InputEncoding): string {
  return toBuffer(input, inputEncoding).toString('hex');
}

export function decodeHex(input: string): DecodeResult {
  validateHex(input);
  const buf = Buffer.from(input, 'hex');
  return decodeToString(buf);
}

// ---------------------------------------------------------------------------
// URL (RFC 3986)
// ---------------------------------------------------------------------------

export function encodeUrl(input: string): string {
  // encodeURIComponent does not encode !'()* per RFC 3986
  return encodeURIComponent(input).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function decodeUrl(input: string): string {
  return decodeURIComponent(input);
}

// ---------------------------------------------------------------------------
// HTML entities (via `he`)
// ---------------------------------------------------------------------------

export function encodeHtml(input: string): string {
  return he.encode(input, { useNamedReferences: true });
}

export function decodeHtml(input: string): string {
  return he.decode(input);
}
