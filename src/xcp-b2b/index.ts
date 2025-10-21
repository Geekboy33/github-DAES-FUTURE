/**
 * XCP B2B API Client - Public API
 * Enterprise-grade banking integration module
 */

// Main Client
export { XcpB2BClient } from './client';

// Configuration
export { loadConfig, getConfig, type XcpConfig } from './config';

// Type Definitions
export type {
  Amount,
  BankAccount,
  TokenRequest,
  TokenResponse,
  RemittanceRequest,
  RemittanceResponse,
  RemittanceStatus,
  RemittanceDetail,
  RemittanceType,
  ChargeBearer,
  WebhookEvent,
  WebhookRegistration,
  WebhookResponse,
  RetryPolicy,
  StatementRequest,
  BalanceResponse,
  ErrorPayload,
  RequestOptions,
} from './types';

// Error Classes
export { XcpApiError } from './types';

// Utility Functions (for advanced use cases)
export {
  sha256Base64,
  canonicalRequest,
  hmacBase64,
  generateTimestamp,
  isTimestampValid,
} from './signature';

// HTTP Utilities
export { withRetry, isIdempotentMethod } from './http';

/**
 * Quick Start Example:
 * 
 * ```typescript
 * import { XcpB2BClient } from './xcp-b2b';
 * 
 * const client = new XcpB2BClient();
 * 
 * // Get token
 * await client.getToken({
 *   accountId: 'acc_123',
 *   correspondentBankId: 'bank_abc',
 *   permissionId: 'perm_remit',
 *   scope: 'remittance:write remittance:read'
 * });
 * 
 * // Create remittance
 * const result = await client.createRemittance({
 *   userId: 'user_001',
 *   destinationAccountNumber: 'acc_456',
 *   amount: { value: 1000.00, currency: 'USD' },
 *   remittanceBankName: 'Your Bank',
 *   correspondentBankId: 'bank_abc',
 *   bankId: 'xcp_main',
 *   remittanceType: 'DEBIT',
 *   reference: 'INV-2025-0001',
 *   purposeCode: 'GDDS'
 * });
 * 
 * // Wait for completion
 * const final = await client.waitForRemittanceCompletion(result.transactionId);
 * console.log('MT103 Reference:', final.mt103Reference);
 * ```
 */

