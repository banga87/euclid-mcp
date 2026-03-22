// src/error-hints/encode.ts

export const EXAMPLES = [
  'encode({ operation: "base64_encode", input: "hello" })',
  'encode({ operation: "sha256", input: "hello world" })',
  'encode({ operation: "hmac", input: "data", key: "secret", algorithm: "sha256" })',
  'encode({ operation: "jwt_decode", input: "eyJ..." })',
  'encode({ operation: "url_encode", input: "a=1&b=2" })',
];

export function getHint(errorMessage: string): string {
  if (errorMessage.includes('Invalid Base64 input')) {
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
