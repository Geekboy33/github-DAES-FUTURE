/**
 * XCP B2B API - Configuration Management
 * Loads and validates environment variables with Zod
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Configuration schema with strict validation
 */
const ConfigSchema = z.object({
  // API Endpoint
  XCP_BASE_URL: z.string().url().describe('Base URL for XCP B2B API'),
  
  // Authentication
  XCP_API_KEY: z.string().min(1).describe('API Key for initial token endpoint'),
  XCP_API_SECRET: z.string().min(1).describe('API Secret for HMAC request signing'),
  
  // Account Information
  XCP_ACCOUNT_ID: z.string().min(1).describe('Account ID'),
  XCP_ACCOUNT_HOLDER_ID: z.string().min(1).describe('Account Holder ID'),
  XCP_BANK_ID: z.string().min(1).describe('Bank/Correspondent Bank ID'),
  XCP_PERMISSION_ID: z.string().min(1).describe('Permission ID for token requests'),
  
  // mTLS Certificate Paths
  XCP_CLIENT_CERT_PATH: z.string().min(1).describe('Path to client certificate (PEM)'),
  XCP_CLIENT_KEY_PATH: z.string().min(1).describe('Path to client private key (PEM)'),
  XCP_CA_CERT_PATH: z.string().min(1).describe('Path to CA certificate chain (PEM)'),
  
  // Optional: Timeouts (milliseconds)
  XCP_TOKEN_TIMEOUT_MS: z.string().default('30000').transform(Number),
  XCP_REQUEST_TIMEOUT_MS: z.string().default('60000').transform(Number),
  
  // Optional: Retry Configuration
  XCP_MAX_RETRIES: z.string().default('3').transform(Number),
  XCP_RETRY_DELAY_MS: z.string().default('1000').transform(Number),
});

export type XcpConfig = z.infer<typeof ConfigSchema>;

/**
 * Parse and validate configuration from environment
 * Throws detailed error if validation fails
 */
export function loadConfig(): XcpConfig {
  const result = ConfigSchema.safeParse(process.env);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => 
      `  - ${err.path.join('.')}: ${err.message}`
    ).join('\n');
    
    throw new Error(
      `❌ XCP B2B Configuration Error:\n${errors}\n\n` +
      `Please check your .env file and ensure all required variables are set.`
    );
  }
  
  return result.data;
}

/**
 * Singleton config instance
 */
let configInstance: XcpConfig | null = null;

export function getConfig(): XcpConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Helper to resolve certificate paths relative to project root
 */
export function resolveCertPath(relativePath: string): string {
  return path.resolve(process.cwd(), relativePath);
}

/**
 * Mask sensitive values for logging
 */
export function maskSecret(value: string, visibleChars = 4): string {
  if (value.length <= visibleChars * 2) return '***';
  return `${value.slice(0, visibleChars)}...${value.slice(-visibleChars)}`;
}

