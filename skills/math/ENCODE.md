# Encode Reference — `encode` tool

## Operations

### Codec (reversible)

| Operation          | Required Fields | Optional Fields  | Returns                                  |
| ------------------ | --------------- | ---------------- | ---------------------------------------- |
| `base64_encode`    | `input`         | `input_encoding` | Base64 string (padded, RFC 4648)         |
| `base64_decode`    | `input`         | —                | UTF-8 string (or hex if binary)          |
| `base64url_encode` | `input`         | `input_encoding` | Base64url string (unpadded, RFC 4648 §5) |
| `base64url_decode` | `input`         | —                | UTF-8 string (or hex if binary)          |
| `hex_encode`       | `input`         | `input_encoding` | Lowercase hex string                     |
| `hex_decode`       | `input`         | —                | UTF-8 string (or hex if binary)          |
| `url_encode`       | `input`         | —                | Percent-encoded string (RFC 3986)        |
| `url_decode`       | `input`         | —                | UTF-8 string                             |
| `html_encode`      | `input`         | —                | HTML entity string                       |
| `html_decode`      | `input`         | —                | UTF-8 string                             |

### Hash (irreversible)

| Operation | Required Fields             | Optional Fields                                     | Returns             |
| --------- | --------------------------- | --------------------------------------------------- | ------------------- |
| `sha256`  | `input`                     | `input_encoding`, `output_encoding`                 | 64-char hex string  |
| `sha512`  | `input`                     | `input_encoding`, `output_encoding`                 | 128-char hex string |
| `sha1`    | `input`                     | `input_encoding`, `output_encoding`                 | 40-char hex string  |
| `md5`     | `input`                     | `input_encoding`, `output_encoding`                 | 32-char hex string  |
| `hmac`    | `input`, `key`, `algorithm` | `input_encoding`, `key_encoding`, `output_encoding` | Hex string          |

### JWT (structured decode)

| Operation    | Required Fields | Optional Fields | Returns                             |
| ------------ | --------------- | --------------- | ----------------------------------- |
| `jwt_decode` | `input`         | —               | Header + payload + signature (JSON) |

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

| Value    | Meaning                | Example                    |
| -------- | ---------------------- | -------------------------- |
| `utf8`   | UTF-8 string (default) | `"hello world"`            |
| `hex`    | Hex-encoded bytes      | `"48656c6c6f"` (= "Hello") |
| `base64` | Base64-encoded bytes   | `"SGVsbG8="` (= "Hello")   |

Only valid for encode-direction codec operations (`base64_encode`, `base64url_encode`, `hex_encode`)
and all hash operations. Decode operations and `url_encode`/`html_encode` always take UTF-8 strings.

## Output Encoding (hash only)

Hash and HMAC results default to `hex`. Set `output_encoding: "base64"` for Base64 output
(used by some APIs like AWS signature verification).

## Common Errors

| Error                          | Cause                                  | Fix                                              |
| ------------------------------ | -------------------------------------- | ------------------------------------------------ |
| `"Invalid Base64 input: ..."`  | Non-Base64 characters in input         | Check for URL-safe chars; use `base64url_decode` |
| `"Invalid hex input: ..."`     | Odd length or non-hex characters       | Ensure even length, chars 0-9 and a-f only       |
| `"Invalid JWT: ..."`           | Wrong number of dot-separated segments | JWTs must have exactly 3 segments                |
| `"'hmac' requires: key, ..."`  | Missing key or algorithm for HMAC      | Provide both `key` and `algorithm`               |
| `"Input exceeds maximum size"` | Input over 1 MB                        | Reduce input size                                |

## Key Design Notes

**JWT decode is read-only.** The tool decodes JWTs without verifying signatures. Every response
includes a warning. Never trust decoded claims for authentication without server-side verification.

**MD5 and SHA-1 are legacy.** Responses include a note that these algorithms are not
collision-resistant. They are still valid for checksums, cache keys, and legacy compatibility.

**Hashing operates on bytes, not characters.** "cafe" (4 bytes) and "café" (5 bytes in UTF-8)
produce different hashes. The tool always UTF-8 encodes string inputs before hashing.

**Normalization is automatic.** Unpadded Base64 is auto-padded. Hex inputs with `0x` prefix,
spaces, or colons are cleaned up automatically. A note is included when normalization occurs.
