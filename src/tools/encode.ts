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
