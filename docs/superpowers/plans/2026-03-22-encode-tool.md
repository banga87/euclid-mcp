# Encode Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single `encode` MCP tool with 16 operations (codec, hash, JWT decode) to the Euclid server.

**Architecture:** Three engine files (`encode-codec.ts`, `encode-hash.ts`, `encode-jwt.ts`) handle the implementation, dispatched from a single tool handler (`src/tools/encode.ts`). Normalization and error hints follow existing patterns. One new runtime dependency: `he` for HTML entities.

**Tech Stack:** Node.js built-ins (`crypto`, `Buffer`, `encodeURIComponent`), `he` library, Zod v4, vitest

**Spec:** `docs/superpowers/specs/2026-03-22-encode-tool-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/engines/encode-codec.ts` (create) | Base64, base64url, hex, URL, HTML encode/decode using Buffer and `he` |
| `src/engines/encode-hash.ts` (create) | SHA-256/512, SHA-1, MD5, HMAC via `crypto` |
| `src/engines/encode-jwt.ts` (create) | JWT decode (split, base64url-decode, JSON.parse) |
| `src/tools/encode.ts` (create) | Tool definition (name, description, Zod schema) + handler with validation and dispatch |
| `src/error-hints/encode.ts` (create) | Static EXAMPLES + getHint() pattern matching |
| `src/normalization.ts` (modify) | Add `normalizeEncodeInput()` returning `NormalizeResult` |
| `src/error-hints/index.ts` (modify) | Add `'encode'` to ToolName union and registry |
| `src/index.ts` (modify) | Register encode tool with server |
| `skills/math/ENCODE.md` (create) | Operation reference for LLM skill |
| `skills/math/SKILL.md` (modify) | Add encode to tool selection table |
| `.claude-plugin/plugin.json` (modify) | Update description and bump version |
| `package.json` (modify) | Add `he` runtime dependency |
| `tests/encode.test.ts` (create) | Full test coverage |

---

### Task 1: Install `he` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install `he` as a runtime dependency**

Run: `cd euclid && pnpm add he`

- [ ] **Step 2: Install `@types/he` as a dev dependency**

Run: `cd euclid && pnpm add -D @types/he`

- [ ] **Step 3: Verify installation**

Run: `cd euclid && pnpm test`
Expected: All existing tests still pass.

- [ ] **Step 4: Commit**

```bash
cd euclid && git add package.json pnpm-lock.yaml
git commit -m "chore: add he dependency for HTML entity encoding"
```

---

### Task 2: Codec engine — base64, hex, URL, HTML encode/decode

**Files:**
- Create: `src/engines/encode-codec.ts`
- Create: `tests/encode-codec.test.ts`

- [ ] **Step 1: Write failing tests for codec operations**

Create `tests/encode-codec.test.ts`:

```typescript
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
      // "subjects?_d" contains chars that differ in base64 vs base64url
      const result = encodeBase64url('subjects?_d', 'utf8');
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });

    it('decodes Base64url to UTF-8', () => {
      // The JWT header {"alg":"HS256","typ":"JWT"}
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd euclid && pnpm test -- tests/encode-codec.test.ts`
Expected: FAIL — module `../src/engines/encode-codec.js` not found.

- [ ] **Step 3: Implement the codec engine**

Create `src/engines/encode-codec.ts`:

```typescript
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
    throw new Error(`Invalid Base64 input: unexpected character '${badChar?.[0]}' at position ${pos}`);
  }
}

function validateBase64url(input: string): void {
  const stripped = input.replace(/=+$/, '');
  if (stripped.length > 0 && !/^[A-Za-z0-9_-]*$/.test(stripped)) {
    const badChar = stripped.match(/[^A-Za-z0-9_-]/);
    const pos = badChar ? stripped.indexOf(badChar[0]) : -1;
    throw new Error(`Invalid Base64url input: unexpected character '${badChar?.[0]}' at position ${pos}`);
  }
}

function validateHex(input: string): void {
  if (input.length % 2 !== 0) {
    throw new Error(`Invalid hex input: odd number of characters (${input.length}). Hex strings must have even length.`);
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
  return toBuffer(input, inputEncoding)
    .toString('base64url');
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
  return encodeURIComponent(input).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd euclid && pnpm test -- tests/encode-codec.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run full test suite to check for regressions**

Run: `cd euclid && pnpm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
cd euclid && git add src/engines/encode-codec.ts tests/encode-codec.test.ts
git commit -m "feat: add codec engine (base64, hex, url, html encode/decode)"
```

---

### Task 3: Hash engine — SHA-256/512, SHA-1, MD5, HMAC

**Files:**
- Create: `src/engines/encode-hash.ts`
- Create: `tests/encode-hash.test.ts`

- [ ] **Step 1: Write failing tests for hash operations**

Create `tests/encode-hash.test.ts`:

```typescript
// tests/encode-hash.test.ts
import { describe, it, expect } from 'vitest';
import { computeHash, computeHmac } from '../src/engines/encode-hash.js';

describe('encode-hash', () => {
  // Known test vectors from NIST / RFC 4231
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
        '309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f'
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
      // "Hi" = 0x4869
      const result = computeHash('sha256', '4869', 'hex', 'hex');
      const expected = computeHash('sha256', 'Hi', 'utf8', 'hex');
      expect(result).toBe(expected);
    });

    it('accepts base64 input_encoding', () => {
      // "Hi" = "SGk=" in base64
      const result = computeHash('sha256', 'SGk=', 'base64', 'hex');
      const expected = computeHash('sha256', 'Hi', 'utf8', 'hex');
      expect(result).toBe(expected);
    });

    it('supports base64 output_encoding', () => {
      const hex = computeHash('sha256', 'hello world', 'utf8', 'hex');
      const b64 = computeHash('sha256', 'hello world', 'utf8', 'base64');
      // Convert hex to base64 manually and compare
      expect(Buffer.from(hex, 'hex').toString('base64')).toBe(b64);
    });

    it('handles UTF-8 multibyte characters', () => {
      // "café" is 5 bytes in UTF-8 (c=1, a=1, f=1, é=2)
      const hash1 = computeHash('sha256', 'cafe', 'utf8', 'hex');
      const hash2 = computeHash('sha256', 'caf\u00e9', 'utf8', 'hex');
      expect(hash1).not.toBe(hash2); // Different bytes = different hash
    });
  });

  describe('computeHmac', () => {
    it('HMAC-SHA256 with known key', () => {
      const result = computeHmac('sha256', 'hello world', 'utf8', 'secret', 'utf8', 'hex');
      expect(result).toHaveLength(64);
      // Verify it is deterministic
      const result2 = computeHmac('sha256', 'hello world', 'utf8', 'secret', 'utf8', 'hex');
      expect(result).toBe(result2);
    });

    it('HMAC-SHA512 produces 128-char hex', () => {
      const result = computeHmac('sha512', 'data', 'utf8', 'key', 'utf8', 'hex');
      expect(result).toHaveLength(128);
    });

    it('supports hex key_encoding', () => {
      // "key" = 0x6b6579
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd euclid && pnpm test -- tests/encode-hash.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hash engine**

Create `src/engines/encode-hash.ts`:

```typescript
// src/engines/encode-hash.ts
import { createHash, createHmac } from 'node:crypto';

export type HashAlgorithm = 'sha256' | 'sha512' | 'sha1' | 'md5';
export type InputEncoding = 'utf8' | 'hex' | 'base64';
export type OutputEncoding = 'hex' | 'base64';

export function computeHash(
  algorithm: HashAlgorithm,
  input: string,
  inputEncoding: InputEncoding,
  outputEncoding: OutputEncoding,
): string {
  const buf = Buffer.from(input, inputEncoding);
  return createHash(algorithm).update(buf).digest(outputEncoding);
}

export function computeHmac(
  algorithm: HashAlgorithm,
  input: string,
  inputEncoding: InputEncoding,
  key: string,
  keyEncoding: InputEncoding,
  outputEncoding: OutputEncoding,
): string {
  const inputBuf = Buffer.from(input, inputEncoding);
  const keyBuf = Buffer.from(key, keyEncoding);
  return createHmac(algorithm, keyBuf).update(inputBuf).digest(outputEncoding);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd euclid && pnpm test -- tests/encode-hash.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd euclid && git add src/engines/encode-hash.ts tests/encode-hash.test.ts
git commit -m "feat: add hash engine (sha256, sha512, sha1, md5, hmac)"
```

---

### Task 4: JWT engine — decode without verification

**Files:**
- Create: `src/engines/encode-jwt.ts`
- Create: `tests/encode-jwt.test.ts`

- [ ] **Step 1: Write failing tests for JWT decode**

Create `tests/encode-jwt.test.ts`:

```typescript
// tests/encode-jwt.test.ts
import { describe, it, expect } from 'vitest';
import { decodeJwt } from '../src/engines/encode-jwt.js';

describe('encode-jwt', () => {
  // A real JWT: {"alg":"HS256","typ":"JWT"}.{"sub":"user_123","exp":1711329600}.signature
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
    // "not json" base64url-encoded = "bm90IGpzb24"
    expect(() => decodeJwt('bm90IGpzb24.eyJzdWIiOiIxMjMifQ.sig')).toThrow(/header/i);
  });

  it('throws on invalid JSON in payload', () => {
    expect(() => decodeJwt('eyJhbGciOiJIUzI1NiJ9.bm90IGpzb24.sig')).toThrow(/payload/i);
  });

  it('handles empty string', () => {
    expect(() => decodeJwt('')).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd euclid && pnpm test -- tests/encode-jwt.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the JWT engine**

Create `src/engines/encode-jwt.ts`:

```typescript
// src/engines/encode-jwt.ts

export type JwtResult = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
};

export function decodeJwt(input: string): JwtResult {
  const segments = input.split('.');
  if (segments.length !== 3) {
    throw new Error(
      `Invalid JWT: expected 3 dot-separated segments (header.payload.signature), got ${segments.length}`
    );
  }

  const [headerB64, payloadB64, signature] = segments;

  let header: Record<string, unknown>;
  try {
    const headerJson = Buffer.from(headerB64, 'base64url').toString('utf8');
    header = JSON.parse(headerJson);
  } catch {
    throw new Error('Invalid JWT header: segment is not valid Base64url-encoded JSON');
  }

  let payload: Record<string, unknown>;
  try {
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    payload = JSON.parse(payloadJson);
  } catch {
    throw new Error('Invalid JWT payload: segment is not valid Base64url-encoded JSON');
  }

  return { header, payload, signature };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd euclid && pnpm test -- tests/encode-jwt.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd euclid && git add src/engines/encode-jwt.ts tests/encode-jwt.test.ts
git commit -m "feat: add JWT decode engine (read-only, no verification)"
```

---

### Task 5: Normalization — `normalizeEncodeInput()`

**Files:**
- Modify: `src/normalization.ts`
- Create: `tests/encode-normalization.test.ts`

- [ ] **Step 1: Write failing tests for encode normalization**

Create `tests/encode-normalization.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd euclid && pnpm test -- tests/encode-normalization.test.ts`
Expected: FAIL — `normalizeEncodeInput` is not exported.

- [ ] **Step 3: Add `normalizeEncodeInput` to `src/normalization.ts`**

Add at the end of `src/normalization.ts`:

```typescript
// ---------------------------------------------------------------------------
// Encode normalization
// ---------------------------------------------------------------------------

// Operations where hex_decode is the inherent format (always normalize hex)
const HEX_DECODE_OPS = new Set(['hex_decode']);

// Hash operations where hex normalization only applies when input_encoding is 'hex'
const HASH_OPS = new Set(['sha256', 'sha512', 'sha1', 'md5', 'hmac']);

// Operations that accept base64 input for decoding
const BASE64_PAD_OPS = new Set(['base64_decode']);

export function normalizeEncodeInput(
  operation: string,
  input: string,
  inputEncoding?: string,
): NormalizeResult {
  let value = input;

  // Base64 padding: add = to make length a multiple of 4
  if (BASE64_PAD_OPS.has(operation)) {
    const remainder = value.length % 4;
    if (remainder !== 0 && value.length > 0) {
      value = value + '='.repeat(4 - remainder);
    }
  }

  // Hex normalization: strip 0x prefix, spaces, colons
  // For hex_decode: always apply (the input IS hex)
  // For hash ops: only apply when input_encoding is 'hex'
  const shouldNormalizeHex =
    HEX_DECODE_OPS.has(operation) ||
    (HASH_OPS.has(operation) && inputEncoding === 'hex');

  if (shouldNormalizeHex) {
    value = value.replace(/^0[xX]/, '');
    value = value.replace(/[\s:]/g, '');
  }

  return {
    value,
    wasTransformed: value !== input,
    original: input,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd euclid && pnpm test -- tests/encode-normalization.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run full test suite**

Run: `cd euclid && pnpm test`
Expected: All tests pass (no regressions).

- [ ] **Step 6: Commit**

```bash
cd euclid && git add src/normalization.ts tests/encode-normalization.test.ts
git commit -m "feat: add normalizeEncodeInput for base64 padding and hex cleanup"
```

---

### Task 6: Error hints — encode module

**Files:**
- Create: `src/error-hints/encode.ts`
- Modify: `src/error-hints/index.ts`

- [ ] **Step 1: Create the error hints module**

Create `src/error-hints/encode.ts`:

```typescript
// src/error-hints/encode.ts

export const EXAMPLES = [
  'encode({ operation: "base64_encode", input: "hello" })',
  'encode({ operation: "sha256", input: "hello world" })',
  'encode({ operation: "hmac", input: "data", key: "secret", algorithm: "sha256" })',
  'encode({ operation: "jwt_decode", input: "eyJ..." })',
  'encode({ operation: "url_encode", input: "a=1&b=2" })',
];

export function getHint(errorMessage: string): string {
  if (errorMessage.includes('Invalid Base64')) {
    return 'Ensure input contains only A-Z, a-z, 0-9, +, /, and = (padding). If the input uses - and _ instead of + and /, use base64url_decode.';
  }
  if (errorMessage.includes('Invalid Base64url')) {
    return 'Ensure input contains only A-Z, a-z, 0-9, -, and _. Standard Base64 uses + and / instead — use base64_decode for that.';
  }
  if (errorMessage.includes('Invalid hex')) {
    return 'Hex strings must be even length and contain only characters 0-9 and a-f. Prefix 0x is stripped automatically.';
  }
  if (errorMessage.includes('URIError') || errorMessage.includes('URI malformed')) {
    return 'Percent-encoded sequences must be % followed by two hex digits (e.g., %20 for space, %26 for &).';
  }
  if (errorMessage.includes('Invalid JWT')) {
    return 'JWTs must have exactly 3 dot-separated segments: header.payload.signature. Each segment is Base64url-encoded.';
  }
  if (errorMessage.includes('requires') && errorMessage.includes('key')) {
    return 'The hmac operation requires both a key and an algorithm parameter. Supported algorithms: sha256, sha512, sha1, md5.';
  }
  if (errorMessage.includes('requires') && errorMessage.includes('algorithm')) {
    return 'The hmac operation requires an algorithm parameter. Supported values: sha256, sha512, sha1, md5.';
  }
  if (errorMessage.includes('not valid') && errorMessage.includes('operation')) {
    return 'Supported operations: base64_encode, base64_decode, base64url_encode, base64url_decode, hex_encode, hex_decode, url_encode, url_decode, html_encode, html_decode, sha256, sha512, sha1, md5, hmac, jwt_decode.';
  }
  return 'Check the operation name and input format. Use base64_encode/decode for Base64, sha256/sha512 for hashing, hmac for HMAC, jwt_decode for JWT inspection.';
}
```

- [ ] **Step 2: Update `src/error-hints/index.ts` — add encode to ToolName and registry**

In `src/error-hints/index.ts`, add the import and extend the type and registry:

```typescript
// Add import at the top:
import * as encode from './encode.js';

// Change ToolName to:
export type ToolName = 'calculate' | 'convert' | 'statistics' | 'datetime' | 'encode';

// Add to registry:
const registry: Record<ToolName, { getHint: (error: string) => string; EXAMPLES: string[] }> = {
  calculate,
  convert,
  statistics,
  datetime,
  encode,
};
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd euclid && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd euclid && git add src/error-hints/encode.ts src/error-hints/index.ts
git commit -m "feat: add encode error hints with pattern matching"
```

---

### Task 7: Tool handler — `src/tools/encode.ts`

**Files:**
- Create: `src/tools/encode.ts`
- Create: `tests/encode.test.ts`

This is the main integration point. The handler validates inputs per the parameter scope rules, runs normalization, dispatches to the right engine, and wraps responses.

- [ ] **Step 1: Write failing tests for the tool handler**

Create `tests/encode.test.ts`:

```typescript
// tests/encode.test.ts
import { describe, it, expect } from 'vitest';
import { encodeTool } from '../src/tools/encode.js';

// Helper to call handler and parse the JSON response
async function call(args: Record<string, unknown>) {
  const response = await encodeTool.handler(args);
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
      // Verify it is valid base64
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
        // missing algorithm — will error
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
      const bigInput = 'x'.repeat(1_048_577); // 1 MB + 1 byte
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd euclid && pnpm test -- tests/encode.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the tool handler**

Create `src/tools/encode.ts`. This is the largest file — it defines the schema, validates parameters per the scope rules, dispatches to engines, and wraps responses.

```typescript
// src/tools/encode.ts
import { z } from 'zod/v4';
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
  type InputEncoding as CodecInputEncoding,
} from '../engines/encode-codec.js';
import {
  computeHash,
  computeHmac,
  type HashAlgorithm,
  type InputEncoding as HashInputEncoding,
  type OutputEncoding,
} from '../engines/encode-hash.js';
import { decodeJwt } from '../engines/encode-jwt.js';
import { normalizeEncodeInput } from '../normalization.js';
import { getErrorHint } from '../error-hints/index.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_INPUT_BYTES = 1_048_576; // 1 MB

const OPERATIONS = [
  'base64_encode', 'base64_decode',
  'base64url_encode', 'base64url_decode',
  'hex_encode', 'hex_decode',
  'url_encode', 'url_decode',
  'html_encode', 'html_decode',
  'sha256', 'sha512', 'sha1', 'md5', 'hmac',
  'jwt_decode',
] as const;

type EncodeOperation = typeof OPERATIONS[number];

// Operations that accept input_encoding
const INPUT_ENCODING_OPS = new Set<EncodeOperation>([
  'base64_encode', 'base64url_encode', 'hex_encode',
  'sha256', 'sha512', 'sha1', 'md5', 'hmac',
]);

// Operations that accept output_encoding
const OUTPUT_ENCODING_OPS = new Set<EncodeOperation>([
  'sha256', 'sha512', 'sha1', 'md5', 'hmac',
]);

const ALGORITHM_NOTES: Record<string, string> = {
  sha256: 'SHA-256 produces a 256-bit (32-byte) digest.',
  sha512: 'SHA-512 produces a 512-bit (64-byte) digest.',
  sha1: 'SHA-1 is not collision-resistant. Suitable for checksums and legacy compatibility, not security.',
  md5: 'MD5 is not collision-resistant. Suitable for checksums and legacy compatibility, not security.',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorResponse(error: string, operation: string) {
  const { hint, examples } = getErrorHint('encode', error);
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error, operation, hint, examples }) }],
    isError: true as const,
  };
}

function successResponse(data: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data) }],
  };
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const encodeTool = {
  name: 'encode',

  description: `Performs encoding, decoding, hashing, and JWT inspection deterministically. Use this tool whenever you need to encode or decode data (Base64, hex, URL, HTML), compute a hash or HMAC, or inspect a JWT.

IMPORTANT: Never predict or guess encoded/hashed outputs. Base64, hex, URL-encoded strings, and hash digests must be computed — LLM predictions will be plausible but wrong.

Codec operations (reversible):
- base64_encode / base64_decode — RFC 4648 standard Base64
- base64url_encode / base64url_decode — URL-safe Base64 (used in JWTs)
- hex_encode / hex_decode — hexadecimal representation
- url_encode / url_decode — RFC 3986 percent-encoding
- html_encode / html_decode — HTML entity encoding (full HTML5 entity set)

Hash operations (irreversible):
- sha256, sha512, sha1, md5 — cryptographic hash digests
- hmac — keyed-hash message authentication code (requires key + algorithm)

JWT:
- jwt_decode — decode a JWT into header + payload + signature (no verification)

Examples:
- encode({ operation: "base64_encode", input: "hello world" })
- encode({ operation: "sha256", input: "hello world" })
- encode({ operation: "hmac", input: "payload", key: "secret", algorithm: "sha256" })
- encode({ operation: "jwt_decode", input: "eyJ..." })
- encode({ operation: "url_encode", input: "price <= 100 & category = \\"books\\"" })

Parameters:
- input_encoding: "utf8" (default) | "hex" | "base64" — how to interpret the input bytes (encode + hash ops only)
- output_encoding: "hex" (default) | "base64" — output format for hash results
- key / key_encoding / algorithm — required for hmac only`,

  inputSchema: z.object({
    operation: z
      .enum(OPERATIONS)
      .describe('The encode/decode/hash operation to perform'),
    input: z
      .string()
      .describe('The input string to process'),
    input_encoding: z
      .enum(['utf8', 'hex', 'base64'])
      .optional()
      .describe('How to interpret the input bytes. Default: utf8. Only for encode and hash operations.'),
    key: z
      .string()
      .optional()
      .describe('HMAC key (required for hmac operation only)'),
    key_encoding: z
      .enum(['utf8', 'hex', 'base64'])
      .optional()
      .describe('How to interpret the key bytes. Default: utf8. Only for hmac.'),
    algorithm: z
      .enum(['sha256', 'sha512', 'sha1', 'md5'])
      .optional()
      .describe('Hash algorithm for hmac. Required for hmac only.'),
    output_encoding: z
      .enum(['hex', 'base64'])
      .optional()
      .describe('Output format for hash/hmac results. Default: hex. Only for hash operations.'),
  }),

  handler: async (args: {
    operation: string;
    input: string;
    input_encoding?: string;
    key?: string;
    key_encoding?: string;
    algorithm?: string;
    output_encoding?: string;
  }) => {
    const operation = args.operation as EncodeOperation;

    // 1. Validate operation
    if (!OPERATIONS.includes(operation)) {
      return errorResponse(`'${operation}' is not a valid operation. Supported: ${OPERATIONS.join(', ')}`, operation);
    }

    // 2. Validate input under 1 MB
    if (args.input.length > MAX_INPUT_BYTES) {
      return errorResponse(`Input exceeds maximum size of 1 MB (${args.input.length} bytes)`, operation);
    }

    // 3. Validate HMAC-specific required fields
    if (operation === 'hmac') {
      if (!args.key) {
        return errorResponse("'hmac' requires: key, algorithm", operation);
      }
      if (!args.algorithm) {
        return errorResponse("'hmac' requires: algorithm (sha256, sha512, sha1, md5)", operation);
      }
    }

    // 4. Validate parameter scope rules
    if (args.input_encoding && !INPUT_ENCODING_OPS.has(operation)) {
      return errorResponse(
        `input_encoding is not valid for '${operation}'. It applies to encode and hash operations only.`,
        operation,
      );
    }
    if (args.output_encoding && !OUTPUT_ENCODING_OPS.has(operation)) {
      return errorResponse(
        `output_encoding is not valid for '${operation}'. It applies to hash/hmac operations only.`,
        operation,
      );
    }
    if (args.key && operation !== 'hmac') {
      return errorResponse(`key is only valid for the 'hmac' operation`, operation);
    }
    if (args.key_encoding && operation !== 'hmac') {
      return errorResponse(`key_encoding is only valid for the 'hmac' operation`, operation);
    }
    if (args.algorithm && operation !== 'hmac') {
      return errorResponse(`algorithm is only valid for the 'hmac' operation`, operation);
    }

    // 5. Normalization
    const inputEncoding = (args.input_encoding || 'utf8') as CodecInputEncoding;
    const norm = normalizeEncodeInput(operation, args.input, inputEncoding);
    const input = norm.value;
    const outputEncoding = (args.output_encoding || 'hex') as OutputEncoding;

    try {
      // 6. Dispatch
      let responseData: Record<string, unknown>;

      switch (operation) {
        // --- Codec ---
        case 'base64_encode': {
          const result = encodeBase64(input, inputEncoding);
          responseData = { operation, result, input_length: input.length, output_length: result.length };
          break;
        }
        case 'base64_decode': {
          const { result, isBinary } = decodeBase64(input);
          responseData = { operation, result, input_length: input.length, output_length: result.length };
          if (isBinary) {
            responseData.output_encoding = 'hex';
            responseData.note = 'Output contains binary data (not valid UTF-8). Displayed as hex.';
          }
          break;
        }
        case 'base64url_encode': {
          const result = encodeBase64url(input, inputEncoding);
          responseData = { operation, result, input_length: input.length, output_length: result.length };
          break;
        }
        case 'base64url_decode': {
          const { result, isBinary } = decodeBase64url(input);
          responseData = { operation, result, input_length: input.length, output_length: result.length };
          if (isBinary) {
            responseData.output_encoding = 'hex';
            responseData.note = 'Output contains binary data (not valid UTF-8). Displayed as hex.';
          }
          break;
        }
        case 'hex_encode': {
          const result = encodeHex(input, inputEncoding);
          responseData = { operation, result, input_length: input.length, output_length: result.length };
          break;
        }
        case 'hex_decode': {
          const { result, isBinary } = decodeHex(input);
          responseData = { operation, result, input_length: input.length, output_length: result.length };
          if (isBinary) {
            responseData.note = 'Output contains binary data (not valid UTF-8). Displayed as hex.';
          }
          break;
        }
        case 'url_encode': {
          const result = encodeUrl(input);
          responseData = { operation, result, input_length: input.length, output_length: result.length };
          break;
        }
        case 'url_decode': {
          const result = decodeUrl(input);
          responseData = { operation, result, input_length: input.length, output_length: result.length };
          break;
        }
        case 'html_encode': {
          const result = encodeHtml(input);
          responseData = { operation, result, input_length: input.length, output_length: result.length };
          break;
        }
        case 'html_decode': {
          const result = decodeHtml(input);
          responseData = { operation, result, input_length: input.length, output_length: result.length };
          break;
        }

        // --- Hash ---
        case 'sha256':
        case 'sha512':
        case 'sha1':
        case 'md5': {
          const result = computeHash(operation as HashAlgorithm, input, inputEncoding as HashInputEncoding, outputEncoding);
          responseData = {
            operation,
            result,
            input_length: input.length,
            output_encoding: outputEncoding,
            algorithm_note: ALGORITHM_NOTES[operation],
          };
          break;
        }
        case 'hmac': {
          const algorithm = args.algorithm as HashAlgorithm;
          const keyEncoding = (args.key_encoding || 'utf8') as HashInputEncoding;
          const result = computeHmac(algorithm, input, inputEncoding as HashInputEncoding, args.key!, keyEncoding, outputEncoding);
          const algoUpper = algorithm.toUpperCase().replace('SHA', 'SHA-');
          responseData = {
            operation,
            algorithm,
            result,
            input_length: input.length,
            output_encoding: outputEncoding,
            algorithm_note: `HMAC-${algoUpper} produces a ${algorithm === 'sha512' ? '512' : algorithm === 'sha256' ? '256' : algorithm === 'sha1' ? '160' : '128'}-bit message authentication code.`,
          };
          break;
        }

        // --- JWT ---
        case 'jwt_decode': {
          const { header, payload, signature } = decodeJwt(input);
          responseData = {
            operation,
            header,
            payload,
            signature,
            warning: 'Decoded without signature verification. Do not trust claims for auth decisions without server-side verification.',
          };
          break;
        }

        default:
          return errorResponse(`Unknown operation: '${operation}'`, operation);
      }

      // Add normalization note if transformed (but don't override binary notes)
      if (norm.wasTransformed && !responseData.note) {
        responseData.note = `Interpreted: ${norm.original} → ${norm.value}`;
      }

      return successResponse(responseData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResponse(message, operation);
    }
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd euclid && pnpm test -- tests/encode.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run full test suite**

Run: `cd euclid && pnpm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
cd euclid && git add src/tools/encode.ts tests/encode.test.ts
git commit -m "feat: add encode tool handler with validation and dispatch"
```

---

### Task 8: Register tool in server

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add import and registration**

In `src/index.ts`, add the import after the existing tool imports:

```typescript
import { encodeTool } from './tools/encode.js';
```

Add tool registration after the existing `datetimeTool` registration block:

```typescript
server.registerTool(
  encodeTool.name,
  {
    description: encodeTool.description,
    inputSchema: encodeTool.inputSchema,
  },
  async (args) =>
    encodeTool.handler(
      args as {
        operation: string;
        input: string;
        input_encoding?: string;
        key?: string;
        key_encoding?: string;
        algorithm?: string;
        output_encoding?: string;
      },
    ),
);
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd euclid && pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Run full test suite**

Run: `cd euclid && pnpm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
cd euclid && git add src/index.ts
git commit -m "feat: register encode tool in MCP server"
```

---

### Task 9: Skill documentation — `ENCODE.md`

**Files:**
- Create: `skills/math/ENCODE.md`
- Modify: `skills/math/SKILL.md`

- [ ] **Step 1: Create `skills/math/ENCODE.md`**

Follow the pattern from `DATETIME.md` — operations table, examples per operation, common errors, key design notes.

```markdown
# Encode Reference — `encode` tool

## Operations

### Codec (reversible)

| Operation        | Required Fields | Optional Fields  | Returns                                     |
| ---------------- | --------------- | ---------------- | ------------------------------------------- |
| `base64_encode`  | `input`         | `input_encoding` | Base64 string (padded, RFC 4648)            |
| `base64_decode`  | `input`         | —                | UTF-8 string (or hex if binary)             |
| `base64url_encode` | `input`       | `input_encoding` | Base64url string (unpadded, RFC 4648 §5)    |
| `base64url_decode` | `input`       | —                | UTF-8 string (or hex if binary)             |
| `hex_encode`     | `input`         | `input_encoding` | Lowercase hex string                        |
| `hex_decode`     | `input`         | —                | UTF-8 string (or hex if binary)             |
| `url_encode`     | `input`         | —                | Percent-encoded string (RFC 3986)           |
| `url_decode`     | `input`         | —                | UTF-8 string                                |
| `html_encode`    | `input`         | —                | HTML entity string                          |
| `html_decode`    | `input`         | —                | UTF-8 string                                |

### Hash (irreversible)

| Operation | Required Fields         | Optional Fields                   | Returns           |
| --------- | ----------------------- | --------------------------------- | ----------------- |
| `sha256`  | `input`                 | `input_encoding`, `output_encoding` | 64-char hex string  |
| `sha512`  | `input`                 | `input_encoding`, `output_encoding` | 128-char hex string |
| `sha1`    | `input`                 | `input_encoding`, `output_encoding` | 40-char hex string  |
| `md5`     | `input`                 | `input_encoding`, `output_encoding` | 32-char hex string  |
| `hmac`    | `input`, `key`, `algorithm` | `input_encoding`, `key_encoding`, `output_encoding` | Hex string |

### JWT (structured decode)

| Operation    | Required Fields | Optional Fields | Returns                              |
| ------------ | --------------- | --------------- | ------------------------------------ |
| `jwt_decode` | `input`         | —               | Header + payload + signature (JSON)  |

## Examples

### `base64_encode` / `base64_decode`

```
encode({ operation: "base64_encode", input: "hello world" })
// → "aGVsbG8gd29ybGQ="

encode({ operation: "base64_decode", input: "aGVsbG8gd29ybGQ=" })
// → "hello world"
```

### `hex_encode` / `hex_decode`

```
encode({ operation: "hex_encode", input: "hello" })
// → "68656c6c6f"

encode({ operation: "hex_decode", input: "68656c6c6f" })
// → "hello"
```

### `url_encode` / `url_decode`

```
encode({ operation: "url_encode", input: "price <= 100 & category = \"books\"" })
// → "price%20%3C%3D%20100%20%26%20category%20%3D%20%22books%22"
```

### `sha256` — hash

```
encode({ operation: "sha256", input: "hello world" })
// → "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
```

### `hmac` — keyed hash

```
encode({ operation: "hmac", input: "{\"id\":\"evt_123\"}", key: "whsec_test123", algorithm: "sha256" })
// → HMAC-SHA256 hex digest
```

### `jwt_decode` — inspect a JWT

```
encode({ operation: "jwt_decode", input: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEyMyJ9.signature" })
// → { header: { alg: "HS256" }, payload: { sub: "user_123" }, signature: "...", warning: "..." }
```

## Input Encoding

By default, `input` is treated as a UTF-8 string. For binary data, set `input_encoding`:

| Value    | Meaning                    | Example                              |
| -------- | -------------------------- | ------------------------------------ |
| `utf8`   | UTF-8 string (default)     | `"hello world"`                      |
| `hex`    | Hex-encoded bytes          | `"48656c6c6f"` (= "Hello")          |
| `base64` | Base64-encoded bytes       | `"SGVsbG8="` (= "Hello")            |

Only valid for encode-direction codec operations (`base64_encode`, `base64url_encode`, `hex_encode`)
and all hash operations. Decode operations and `url_encode`/`html_encode` always take UTF-8 strings.

## Output Encoding (hash only)

Hash and HMAC results default to `hex`. Set `output_encoding: "base64"` for Base64 output
(used by some APIs like AWS signature verification).

## Common Errors

| Error                           | Cause                                  | Fix                                        |
| ------------------------------- | -------------------------------------- | ------------------------------------------ |
| `"Invalid Base64 input: ..."`   | Non-Base64 characters in input         | Check for URL-safe chars; use `base64url_decode` |
| `"Invalid hex input: ..."`      | Odd length or non-hex characters       | Ensure even length, chars 0-9 and a-f only |
| `"Invalid JWT: ..."`            | Wrong number of dot-separated segments | JWTs must have exactly 3 segments          |
| `"'hmac' requires: key, ..."`   | Missing key or algorithm for HMAC      | Provide both `key` and `algorithm`         |
| `"Input exceeds maximum size"`  | Input over 1 MB                        | Reduce input size                          |

## Key Design Notes

**JWT decode is read-only.** The tool decodes JWTs without verifying signatures. Every response
includes a warning. Never trust decoded claims for authentication without server-side verification.

**MD5 and SHA-1 are legacy.** Responses include a note that these algorithms are not
collision-resistant. They are still valid for checksums, cache keys, and legacy compatibility.

**Hashing operates on bytes, not characters.** "cafe" (4 bytes) and "café" (5 bytes in UTF-8)
produce different hashes. The tool always UTF-8 encodes string inputs before hashing.

**Normalization is automatic.** Unpadded Base64 is auto-padded. Hex inputs with `0x` prefix,
spaces, or colons are cleaned up automatically. A note is included when normalization occurs.
```

- [ ] **Step 2: Update `skills/math/SKILL.md`**

Add the encode row to the "Which Tool to Use" table (after the `datetime` row):

```markdown
| To encode, decode, hash, or inspect a JWT | `encode`     | "Base64-encode this" → `encode("base64_encode", ...)`          |
```

Add a quick reference section at the end (before the closing, after the datetime section):

```markdown
### encode

Takes `operation` (enum), `input` (string), and operation-specific optional fields.

\`\`\`
encode({ operation: "base64_encode", input: "hello world" })
encode({ operation: "sha256", input: "hello world" })
encode({ operation: "hmac", input: "data", key: "secret", algorithm: "sha256" })
\`\`\`

Operations: `base64_encode`, `base64_decode`, `base64url_encode`, `base64url_decode`,
`hex_encode`, `hex_decode`, `url_encode`, `url_decode`, `html_encode`, `html_decode`,
`sha256`, `sha512`, `sha1`, `md5`, `hmac`, `jwt_decode`.

For details on each operation, input/output encodings, and edge cases, see [ENCODE.md](ENCODE.md).
```

- [ ] **Step 3: Commit**

```bash
cd euclid && git add skills/math/ENCODE.md skills/math/SKILL.md
git commit -m "docs: add encode skill documentation and update tool selection table"
```

---

### Task 10: Plugin manifest and version bump

**Files:**
- Modify: `.claude-plugin/plugin.json`
- Modify: `package.json`

- [ ] **Step 1: Update plugin.json**

In `.claude-plugin/plugin.json`:
- Update `description` to include "encode" in the tool list: `"...calculate, convert, statistics, datetime, and encode tools..."`
- Bump `version` from `"0.3.0"` to `"0.4.0"`

- [ ] **Step 2: Update package.json version**

In `package.json`, bump `version` from `"0.3.0"` to `"0.4.0"`.

- [ ] **Step 3: Run lint and format**

Run: `cd euclid && pnpm format && pnpm lint`
Expected: No errors.

- [ ] **Step 4: Run full test suite**

Run: `cd euclid && pnpm test`
Expected: All tests pass.

- [ ] **Step 5: Run build**

Run: `cd euclid && pnpm build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
cd euclid && git add .claude-plugin/plugin.json package.json
git commit -m "chore: bump version to 0.4.0 for encode tool release"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run the full CI pipeline locally**

```bash
cd euclid && pnpm format:check && pnpm lint && pnpm test && pnpm build
```
Expected: All four commands pass (this is the CI pipeline).

- [ ] **Step 2: Smoke test the server**

```bash
cd euclid && echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | pnpm dev 2>/dev/null | head -1
```
Expected: JSON response listing 5 tools including `encode`.

- [ ] **Step 3: Verify test coverage areas**

Review that tests cover all areas from the spec's test plan (Section 12):
- Codec round-trips ✓ (Task 2 + Task 7)
- Known hash test vectors ✓ (Task 3)
- HMAC ✓ (Task 3 + Task 7)
- JWT decode ✓ (Task 4 + Task 7)
- input_encoding ✓ (Task 3 + Task 7)
- output_encoding ✓ (Task 3 + Task 7)
- Binary detection ✓ (Task 2 + Task 7)
- Normalization ✓ (Task 5 + Task 7)
- Error hints ✓ (Task 7)
- Input size limit ✓ (Task 7)
- Key safety ✓ (Task 7)
- Empty string ✓ (Task 2 + Task 7)
- UTF-8 multibyte ✓ (Task 3)
- Validation ✓ (Task 7)
