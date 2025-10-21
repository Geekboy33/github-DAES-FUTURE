/**
 * XCP B2B API - Signature & Hashing Utilities
 * Implements HMAC-SHA256 request signing for API security
 */

import crypto from 'crypto';

/**
 * Computes SHA-256 hash of input and returns base64-encoded result
 * Used for body hashing in canonical request
 */
export function sha256Base64(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('base64');
}

/**
 * Builds canonical request string for HMAC signature
 * Format: METHOD\nPATH\nBODY_HASH\nTIMESTAMP
 * 
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - API endpoint path
 * @param bodyB64Sha - Base64-encoded SHA-256 hash of request body
 * @param tsRfc3339 - RFC3339 timestamp
 */
export function canonicalRequest(
  method: string,
  path: string,
  bodyB64Sha: string,
  tsRfc3339: string
): string {
  return [
    method.toUpperCase(),
    path,
    bodyB64Sha,
    tsRfc3339
  ].join('\n');
}

/**
 * Computes HMAC-SHA256 signature and returns base64-encoded result
 * 
 * @param payload - Canonical request string to sign
 * @param secret - API secret key
 */
export function hmacBase64(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('base64');
}

/**
 * Validates timestamp is within acceptable window (±5 minutes)
 * Prevents replay attacks
 */
export function isTimestampValid(tsRfc3339: string, windowMinutes = 5): boolean {
  try {
    const requestTime = new Date(tsRfc3339).getTime();
    const now = Date.now();
    const diff = Math.abs(now - requestTime);
    return diff <= windowMinutes * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Generates current timestamp in RFC3339 format (UTC)
 */
export function generateTimestamp(): string {
  return new Date().toISOString();
}

