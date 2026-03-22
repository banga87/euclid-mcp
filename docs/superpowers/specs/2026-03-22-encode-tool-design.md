# Design spec: encode tool

> **Status:** Approved
> **Date:** 2026-03-22
> **Domain:** Encoding, hashing, decoding, and JWT inspection

---

## 1. Summary

A single `encode` MCP tool that gives agents deterministic access to encoding, decoding, hashing, and JWT inspection. LLMs cannot encode or hash — they predict what outputs look like, producing plausible but incorrect results. This tool wraps Node.js built-ins and the `he` library to provide exact outputs.

Follows the existing Euclid pattern: one tool per domain, consistent with `calculate`, `convert`, `statistics`, `datetime`.

---

## 2. Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Tool count | Single `encode` tool | Consistent with existing one-tool-per-domain pattern. Avoids discovery/naming problems. |
| jwt_decode | Included | High utility, trivial implementation (2 base64url decodes + 2 JSON.parse), agents encounter JWTs constantly. |
| uuid_generate | Excluded | Not encoding/hashing. Only non-deterministic operation (v4 is random). Low agent utility — can call `crypto.randomUUID()` in code. Easy to add later if needed. |
| crc32 | Excluded | Niche for agent use cases. SHA-256/512/SHA-1/MD5/HMAC cover realistic scenarios. Easy to add later. |
| Binary input | UTF-8 default + `input_encoding` parameter (`utf8` \| `hex` \| `base64`) | Keeps simple case simple (90% of calls are UTF-8). Explicit encoding avoids ambiguity for binary data. |
| Hash output | Hex default + `output_encoding` parameter (`hex` \| `base64`) | Covers AWS-style base64 HMAC signatures without a second tool call. |
| Legacy warnings | Always included, framed neutrally | Teaches agents consistently. Factual rather than preachy — MD5 for a cache key is fine. |
| HTML entities | `he` library | Battle-tested (7M+ weekly downloads), zero-dependency, covers all 2,231 HTML5 named entities. Euclid's philosophy is to wrap proven libraries. |

---

## 3. Operation set

16 operations in 3 categories.

### Codec (10 operations — reversible encode/decode pairs)

| Operation | Input | Output | Notes |
|-----------|-------|--------|-------|
| `base64_encode` | UTF-8 string or encoded bytes | Base64 string (padded) | RFC 4648 |
| `base64_decode` | Base64 string | UTF-8 string (or hex if binary) | Accepts padded and unpadded |
| `base64url_encode` | UTF-8 string or encoded bytes | Base64url string (unpadded) | RFC 4648 section 5 |
| `base64url_decode` | Base64url string | UTF-8 string (or hex if binary) | Used in JWTs |
| `hex_encode` | UTF-8 string or encoded bytes | Lowercase hex string | |
| `hex_decode` | Hex string | UTF-8 string (or hex note if binary) | Case-insensitive input |
| `url_encode` | UTF-8 string | Percent-encoded string | RFC 3986 strict |
| `url_decode` | Percent-encoded string | UTF-8 string | |
| `html_encode` | UTF-8 string | HTML entity string | Named entities for common chars, numeric for rest |
| `html_decode` | HTML entity string | UTF-8 string | Handles named, decimal, and hex entities via `he` |

### Hash (5 operations — irreversible digests + HMAC)

| Operation | Input | Output | Notes |
|-----------|-------|--------|-------|
| `sha256` | UTF-8 string or encoded bytes | 64-char hex string (or base64) | Primary recommended hash |
| `sha512` | UTF-8 string or encoded bytes | 128-char hex string (or base64) | |
| `sha1` | UTF-8 string or encoded bytes | 40-char hex string (or base64) | Response notes: not collision-resistant |
| `md5` | UTF-8 string or encoded bytes | 32-char hex string (or base64) | Response notes: not collision-resistant |
| `hmac` | UTF-8 string + key + algorithm | Hex string (or base64) | Supports sha256, sha512, sha1, md5 |

### JWT (1 operation — structured decode)

| Operation | Input | Output | Notes |
|-----------|-------|--------|-------|
| `jwt_decode` | JWT string | Header + payload + signature | Decode only, no verification, no signing. Warning included in every response. |

---

## 4. Tool schema

```typescript
{
  name: 'encode',
  inputSchema: {
    operation: enum [
      // Codec
      'base64_encode', 'base64_decode',
      'base64url_encode', 'base64url_decode',
      'hex_encode', 'hex_decode',
      'url_encode', 'url_decode',
      'html_encode', 'html_decode',
      // Hash
      'sha256', 'sha512', 'sha1', 'md5', 'hmac',
      // JWT
      'jwt_decode'
    ],
    input: string,                                // required for all
    input_encoding: 'utf8' | 'hex' | 'base64',   // optional, default 'utf8'

    // HMAC-specific
    key: string,                                  // required for hmac only
    key_encoding: 'utf8' | 'hex' | 'base64',     // optional, default 'utf8'
    algorithm: 'sha256' | 'sha512' | 'sha1' | 'md5',  // required for hmac only

    // Hash output
    output_encoding: 'hex' | 'base64',            // optional, default 'hex'; hash/hmac only
  }
}
```

Parameter scope rules:

| Parameter | Valid for | Rejected for |
|-----------|-----------|--------------|
| `input_encoding` | `base64_encode`, `base64url_encode`, `hex_encode`, `sha256`, `sha512`, `sha1`, `md5`, `hmac` | All decode operations, `url_encode`, `url_decode`, `html_encode`, `html_decode`, `jwt_decode` |
| `output_encoding` | `sha256`, `sha512`, `sha1`, `md5`, `hmac` | All codec operations, `jwt_decode` |
| `key` | `hmac` (required) | All other operations |
| `key_encoding` | `hmac` | All other operations |
| `algorithm` | `hmac` (required) | All other operations |

Rationale: `input_encoding` only applies to operations that accept "UTF-8 string or encoded bytes" — the encode-direction codec operations and all hash operations. Decode operations have an inherent input format (base64, hex, URL-encoded, etc.) so `input_encoding` is meaningless. `url_encode` and `html_encode` always operate on UTF-8 strings.

Validation order:
1. `operation` is in the enum
2. `input` is present and under 1 MB (checked on the raw `input` string parameter)
3. Operation-specific required fields (`key`/`algorithm` for hmac)
4. Parameter scope rules (reject invalid parameter/operation combinations with clear error)
5. Run normalization
6. Execute engine function
7. Wrap result

---

## 5. Response structure

### Codec responses

```json
{
  "operation": "base64_encode",
  "result": "aGVsbG8gd29ybGQ=",
  "input_length": 11,
  "output_length": 16
}
```

When base64/base64url decode produces non-UTF-8 bytes:
```json
{
  "operation": "base64_decode",
  "result": "89504e470d0a1a0a",
  "input_length": 12,
  "output_length": 8,
  "output_encoding": "hex",
  "note": "Output contains binary data (not valid UTF-8). Displayed as hex."
}
```

### Hash responses

```json
{
  "operation": "sha256",
  "result": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
  "input_length": 11,
  "output_encoding": "hex",
  "algorithm_note": "SHA-256 produces a 256-bit (32-byte) digest."
}
```

SHA-1/MD5 `algorithm_note` examples:
- `"SHA-1 is not collision-resistant. Suitable for checksums and legacy compatibility, not security."`
- `"MD5 is not collision-resistant. Suitable for checksums and legacy compatibility, not security."`

### HMAC responses

```json
{
  "operation": "hmac",
  "algorithm": "sha256",
  "result": "a1b2c3d4...",
  "input_length": 16,
  "output_encoding": "hex",
  "algorithm_note": "HMAC-SHA256 produces a 256-bit message authentication code."
}
```

### JWT decode responses

```json
{
  "operation": "jwt_decode",
  "header": { "alg": "HS256", "typ": "JWT" },
  "payload": { "sub": "user_123", "exp": 1711329600 },
  "signature": "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "warning": "Decoded without signature verification. Do not trust claims for auth decisions without server-side verification."
}
```

### Error responses

```json
{
  "error": "Invalid Base64 input: unexpected character at position 5",
  "operation": "base64_decode",
  "hint": "Ensure the input contains only A-Z, a-z, 0-9, +, /, and = (padding).",
  "examples": ["aGVsbG8=", "SGVsbG8gV29ybGQ="]
}
```

When normalization occurs, a `note` field is added: `"Interpreted: added padding to Base64 input"`.

---

## 6. Engine architecture

Three engine files in `src/engines/`, organized by category. The tool handler imports from all three and dispatches based on operation.

Note: The original three tools (calculate, convert, statistics) share a single `src/engine.ts`. The datetime tool introduced `src/engines/datetime.ts` as the pattern for new domains. The encode domain extends this further with three files because it has 16 operations spanning distinct implementation concerns (Buffer ops, crypto ops, JWT parsing). The tool handler in `src/tools/encode.ts` imports directly from all three engine files — no barrel file needed.

### `src/engines/encode-codec.ts`

Exports:
- `encodeBase64(input, inputEncoding)` / `decodeBase64(input)`
- `encodeBase64url(input, inputEncoding)` / `decodeBase64url(input)`
- `encodeHex(input, inputEncoding)` / `decodeHex(input)`
- `encodeUrl(input)` / `decodeUrl(input)`
- `encodeHtml(input)` / `decodeHtml(input)`

Implementation:
- Base64/Base64url/Hex: `Buffer` (Node built-in)
- URL: `encodeURIComponent` / `decodeURIComponent` with RFC 3986 wrapper to also encode `!'()*`
- HTML: `he` library for both encode and decode
- Base64/Base64url decode: detect non-UTF-8 output and return hex representation with a note

### `src/engines/encode-hash.ts`

Exports:
- `computeHash(algorithm, input, inputEncoding, outputEncoding)`
- `computeHmac(algorithm, input, inputEncoding, key, keyEncoding, outputEncoding)`

Implementation:
- `crypto.createHash(algorithm)` for hashing
- `crypto.createHmac(algorithm, key)` for HMAC
- Single function handles sha256/sha512/sha1/md5 — algorithm is a parameter

### `src/engines/encode-jwt.ts`

Exports:
- `decodeJwt(input)`

Implementation:
- Split on `.`, validate 3 segments
- Base64url-decode header and payload
- JSON.parse both
- Return `{ header, payload, signature }` (signature as raw string)
- No verification, no signing

### `src/tools/encode.ts`

- Defines tool name, description (LLM teaching prompt), inputSchema (Zod v4)
- Handler validates operation-specific required fields
- Dispatches to the right engine function based on operation category
- Wraps results in standard `{ content: [{ type: 'text', text: JSON.stringify(...) }] }` format

---

## 7. Normalization

Minimal for this domain. Added to `src/normalization.ts` as `normalizeEncodeInput(operation, input)`.

Returns `NormalizeResult` (`{ value, wasTransformed, original }`) — the existing type from `src/normalization.ts`.

| Input pattern | Normalization | Applies to |
|---------------|---------------|------------|
| Unpadded base64 | Add `=` padding to make length multiple of 4 | `base64_decode` |
| `0x` prefix on hex | Strip `0x` prefix | `hex_decode`, hash operations with `input_encoding: 'hex'` |
| Spaces/colons in hex | Strip whitespace and colons | `hex_decode`, hash operations with `input_encoding: 'hex'` |

---

## 8. Error hints

New module `src/error-hints/encode.ts`, registered in `src/error-hints/index.ts`.

Follows the existing error-hints pattern: exports a static `EXAMPLES` array and a `getHint(errorMessage)` function. The `EXAMPLES` array is tool-level (not per-operation), covering a representative spread of encode operations. The `getHint()` function pattern-matches error strings and returns operation-context in the `hint` text.

The `ToolName` type in `src/error-hints/index.ts` must be extended to include `'encode'`.

**Static `EXAMPLES` array** (representative spread):
```typescript
['base64_encode "hello"', 'sha256 "hello world"', 'hmac with key and algorithm', 'jwt_decode "eyJ..."', 'url_encode "a=1&b=2"']
```

**`getHint()` pattern matching:**

| Error pattern | Hint text |
|---------------|-----------|
| Invalid Base64 character | Check for URL-safe chars (`-`, `_`); use `base64url_decode` instead |
| Invalid hex (odd length or bad chars) | Hex strings must be even length, characters 0-9 and a-f only |
| Invalid URL encoding (bad percent sequence) | Percent sequences must be `%` followed by two hex digits |
| Unknown HTML entity | Check spelling; use numeric form `&#NNN;` for uncommon characters |
| HMAC missing key | `hmac` operation requires `key` and `algorithm` parameters |
| HMAC missing algorithm | `hmac` operation requires `algorithm` (sha256, sha512, sha1, md5) |
| JWT wrong segment count | JWTs must have exactly 3 dot-separated segments (header.payload.signature) |
| JWT invalid JSON | Base64url segment does not contain valid JSON |

---

## 9. Security

- **No sandbox needed.** Unlike `calculate` (arbitrary expression evaluation), encode operations are fixed-function calls (`Buffer.from()`, `crypto.createHash()`, `he.encode()`). No user-controlled code execution.
- **Input size limit:** 1 MB max on the raw `input` string parameter (before any decoding). Checked at the handler level, consistent with how `calculate` checks `MAX_EXPRESSION_LENGTH` on raw input. Prevents memory exhaustion.
- **No key storage.** HMAC keys exist only for the duration of the function call. Never cached or logged.
- **No secrets in errors.** Error messages never include input data or key material.
- **JWT decode is read-only.** No signing, no verification. Every response includes a warning.
- **One-way operations labeled.** Hash responses include `algorithm_note` making irreversibility clear.

---

## 10. Dependencies

- **`he`** — HTML entity encoding/decoding. Zero-dependency, 7M+ weekly downloads. Covers all 2,231 HTML5 named entities.
- **Node built-ins** — `crypto` (hashing, HMAC), `Buffer` (base64, hex), `encodeURIComponent`/`decodeURIComponent` (URL encoding).

No other new dependencies.

---

## 11. Skill and plugin integration

### New file: `skills/math/ENCODE.md`
- Operation reference table (all 16 operations)
- When to use each operation (decision guide)
- Common patterns (HMAC verification, JWT inspection, URL construction)
- `input_encoding` / `output_encoding` / `key_encoding` usage

### Update: `skills/math/SKILL.md`
Add `encode` to the tool selection decision table:

| Tool | When to Use |
|------|-------------|
| `encode` | Base64, hex, URL, HTML encoding/decoding; SHA-256/512, SHA-1, MD5 hashing; HMAC signatures; JWT decoding |

### Update: `.claude-plugin/plugin.json`
Bump version.

### Update: `src/index.ts`
Register `encode` tool alongside existing tools.

---

## 12. Test plan

New file: `tests/encode.test.ts`.

| Area | Cases |
|------|-------|
| Codec round-trips | Each encode/decode pair: base64, base64url, hex, url, html |
| Known hash test vectors | SHA-256, SHA-512, SHA-1, MD5 of known inputs |
| HMAC | Various key/algorithm combinations, verify against known vectors |
| JWT decode | Valid token, malformed token, missing segments, invalid JSON |
| `input_encoding` | UTF-8 vs hex vs base64 input for hash operations |
| `output_encoding` | Hex vs base64 output for hashes |
| Binary detection | Base64 decode of non-UTF-8 data returns hex with note |
| Normalization | Base64 padding, hex `0x` prefix stripping, hex whitespace stripping |
| Error hints | Invalid base64, missing HMAC key, bad JWT structure |
| Input size limit | Reject input over 1 MB |
| Key safety | Error messages do not contain key material |
| Empty string | Hash of empty string, encode of empty string |
| UTF-8 multibyte | Hash of string with multibyte chars (verify byte-level correctness) |
| Validation | `output_encoding` rejected on codec operations, missing `key` for hmac |

---

## 13. Files to create or modify

### New files
- `src/engines/encode-codec.ts`
- `src/engines/encode-hash.ts`
- `src/engines/encode-jwt.ts`
- `src/tools/encode.ts`
- `src/error-hints/encode.ts`
- `skills/math/ENCODE.md`
- `tests/encode.test.ts`

### Modified files
- `src/index.ts` — register encode tool
- `src/normalization.ts` — add `normalizeEncodeInput()`
- `src/error-hints/index.ts` — register encode hints
- `skills/math/SKILL.md` — add encode to decision table
- `.claude-plugin/plugin.json` — bump version
- `package.json` — add `he` as a runtime `dependency` (not devDependency)
