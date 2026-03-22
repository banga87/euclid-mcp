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
