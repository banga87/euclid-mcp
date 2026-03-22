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
      `Invalid JWT: expected 3 dot-separated segments (header.payload.signature), got ${segments.length}`,
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
