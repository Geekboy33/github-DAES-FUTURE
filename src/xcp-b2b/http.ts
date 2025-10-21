/**
 * XCP B2B API - HTTP Client with mTLS & Request Signing
 * Implements secure communication with exponential backoff retry logic
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import https from 'https';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { XcpConfig, resolveCertPath, maskSecret } from './config';
import { canonicalRequest, hmacBase64, sha256Base64, generateTimestamp } from './signature';
import { XcpApiError } from './types';

/**
 * Create mTLS-enabled HTTPS agent
 */
function createMtlsAgent(config: XcpConfig): https.Agent {
  try {
    const certPath = resolveCertPath(config.XCP_CLIENT_CERT_PATH);
    const keyPath = resolveCertPath(config.XCP_CLIENT_KEY_PATH);
    const caPath = resolveCertPath(config.XCP_CA_CERT_PATH);

    return new https.Agent({
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
      ca: fs.readFileSync(caPath),
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    });
  } catch (error) {
    throw new Error(
      `Failed to load mTLS certificates: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
      `Ensure certificate paths are correct in your .env file.`
    );
  }
}

/**
 * Create axios instance with mTLS and request interceptors
 */
export function createHttpClient(
  config: XcpConfig,
  getAccessToken?: () => string | undefined,
  timeoutMs?: number
): AxiosInstance {
  const instance = axios.create({
    baseURL: config.XCP_BASE_URL,
    httpsAgent: createMtlsAgent(config),
    timeout: timeoutMs || config.XCP_REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'XCP-B2B-Client/1.0.0',
    },
  });

  // Request Interceptor: Add security headers and compute signature
  instance.interceptors.request.use(
    (reqConfig) => {
      const headers = reqConfig.headers;

      // Add JWT token if available
      const token = getAccessToken?.();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Add Account Holder ID
      headers['X-ACCOUNT-HOLDER-ID'] = config.XCP_ACCOUNT_HOLDER_ID;

      // Add or preserve Idempotency-Key
      if (!headers['Idempotency-Key']) {
        headers['Idempotency-Key'] = uuidv4();
      }

      // Generate RFC3339 timestamp
      const timestamp = generateTimestamp();
      headers['X-REQUEST-TIMESTAMP'] = timestamp;

      // Compute request signature
      const path = reqConfig.url?.startsWith('/') 
        ? reqConfig.url 
        : `/${reqConfig.url ?? ''}`;
      
      const body = reqConfig.data 
        ? (typeof reqConfig.data === 'string' ? reqConfig.data : JSON.stringify(reqConfig.data))
        : '';
      
      const bodyHash = sha256Base64(body);
      const method = (reqConfig.method || 'GET').toUpperCase();
      const canonical = canonicalRequest(method, path, bodyHash, timestamp);
      const signature = hmacBase64(canonical, config.XCP_API_SECRET);
      
      headers['X-REQUEST-SIGNATURE'] = signature;

      // Debug logging (optional, can be controlled by env var)
      if (process.env.XCP_DEBUG === 'true') {
        console.log('[XCP] Request:', {
          method,
          path,
          timestamp,
          idempotencyKey: headers['Idempotency-Key'],
          signaturePreview: maskSecret(signature, 8),
        });
      }

      return reqConfig;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor: Normalize errors
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response) {
        // Server responded with error status
        const data = error.response.data as any;
        throw new XcpApiError(
          data?.code || `HTTP_${error.response.status}`,
          data?.message || error.message,
          error.response.status,
          data?.correlationId,
          data?.details
        );
      } else if (error.request) {
        // Request made but no response
        throw new XcpApiError(
          'NETWORK_ERROR',
          'No response received from server',
          undefined,
          undefined,
          { originalError: error.message }
        );
      } else {
        // Error setting up request
        throw new XcpApiError(
          'REQUEST_SETUP_ERROR',
          error.message,
          undefined,
          undefined,
          { originalError: error.message }
        );
      }
    }
  );

  return instance;
}

/**
 * Exponential backoff retry wrapper
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    shouldRetry = (error: any) => {
      // Only retry on transient errors
      if (error instanceof XcpApiError) {
        const status = error.status;
        return status === 429 || (status !== undefined && status >= 500);
      }
      // Retry on network errors
      return error.code === 'NETWORK_ERROR' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
    },
  } = options;

  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if we've exhausted attempts or if error is not retryable
      if (attempt === maxRetries || !shouldRetry(error)) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay = initialDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * baseDelay; // ±30% jitter
      const delay = Math.min(baseDelay + jitter, 30000); // Max 30s

      console.warn(
        `[XCP] Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Helper to check if operation is idempotent (safe to retry)
 */
export function isIdempotentMethod(method: string): boolean {
  return ['GET', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

