/**
 * XCP B2B API - Type Definitions & Zod Schemas
 * Comprehensive type safety for all API operations
 */

import { z } from 'zod';

// ============================================================================
// Common Types
// ============================================================================

export const AmountSchema = z.object({
  value: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD']),
});

export type Amount = z.infer<typeof AmountSchema>;

export const BankAccountSchema = z.object({
  name: z.string(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
});

export type BankAccount = z.infer<typeof BankAccountSchema>;

// ============================================================================
// Token Management
// ============================================================================

export const TokenRequestSchema = z.object({
  accountId: z.string(),
  correspondentBankId: z.string(),
  permissionId: z.string(),
  scope: z.string().optional(),
});

export type TokenRequest = z.infer<typeof TokenRequestSchema>;

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
  permissionId: z.string(),
  scope: z.string().optional(),
  issued_at: z.string().optional(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

// ============================================================================
// Remittance Operations
// ============================================================================

export const RemittanceTypeSchema = z.enum(['DEBIT', 'CREDIT']);
export type RemittanceType = z.infer<typeof RemittanceTypeSchema>;

export const ChargeBearerSchema = z.enum(['SHARED', 'OUR', 'BEN']);
export type ChargeBearer = z.infer<typeof ChargeBearerSchema>;

export const RemittanceRequestSchema = z.object({
  userId: z.string(),
  destinationAccountNumber: z.string(),
  amount: AmountSchema,
  remittanceBankName: z.string(),
  correspondentBankId: z.string(),
  bankId: z.string(),
  remittanceType: RemittanceTypeSchema,
  reference: z.string(),
  purposeCode: z.string(),
  orderingCustomer: BankAccountSchema.optional(),
  beneficiary: BankAccountSchema.optional(),
  chargeBearer: ChargeBearerSchema.default('SHARED'),
  executionDate: z.string().optional(),
  urgent: z.boolean().default(false),
  additionalInfo: z.string().optional(),
});

export type RemittanceRequest = z.infer<typeof RemittanceRequestSchema>;

export const RemittanceResponseSchema = z.object({
  transactionId: z.string(),
  status: z.string(),
  createdAt: z.string(),
  reference: z.string().optional(),
});

export type RemittanceResponse = z.infer<typeof RemittanceResponseSchema>;

export const RemittanceStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'REJECTED',
  'FAILED',
  'CANCELLED',
]);

export type RemittanceStatus = z.infer<typeof RemittanceStatusSchema>;

export const RemittanceDetailSchema = z.object({
  transactionId: z.string(),
  status: RemittanceStatusSchema,
  valueDate: z.string().optional(),
  mt103Reference: z.string().optional(),
  amount: AmountSchema,
  fees: z.object({
    total: z.number(),
    currency: z.string(),
  }).optional(),
  completedAt: z.string().optional(),
  rejectionReason: z.string().optional(),
  failureReason: z.string().optional(),
});

export type RemittanceDetail = z.infer<typeof RemittanceDetailSchema>;

// ============================================================================
// Webhooks
// ============================================================================

export const WebhookEventSchema = z.enum([
  'remittance.completed',
  'remittance.rejected',
  'remittance.pending',
  'remittance.failed',
  'remittance.cancelled',
]);

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

export const RetryPolicySchema = z.object({
  maxRetries: z.number().int().min(0).max(10).default(5),
  backoffStrategy: z.enum(['linear', 'exponential']).default('exponential'),
  maxDelaySeconds: z.number().int().positive().default(300),
});

export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

export const WebhookRegistrationSchema = z.object({
  url: z.string().url(),
  events: z.array(WebhookEventSchema),
  hmacSecret: z.string(),
  retryPolicy: RetryPolicySchema.optional(),
  active: z.boolean().default(true),
});

export type WebhookRegistration = z.infer<typeof WebhookRegistrationSchema>;

export const WebhookResponseSchema = z.object({
  webhookId: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'FAILED']),
  registeredAt: z.string(),
});

export type WebhookResponse = z.infer<typeof WebhookResponseSchema>;

// ============================================================================
// Statements & Balance
// ============================================================================

export const StatementRequestSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.enum(['JSON', 'MT940', 'CSV']).default('JSON'),
});

export type StatementRequest = z.infer<typeof StatementRequestSchema>;

export const BalanceResponseSchema = z.object({
  accountId: z.string(),
  balance: AmountSchema,
  availableBalance: AmountSchema.optional(),
  currency: z.string(),
  lastUpdated: z.string(),
});

export type BalanceResponse = z.infer<typeof BalanceResponseSchema>;

// ============================================================================
// Error Handling
// ============================================================================

export const ErrorPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
  correlationId: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  timestamp: z.string().optional(),
});

export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;

export class XcpApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
    public correlationId?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'XcpApiError';
  }
}

// ============================================================================
// Request Options
// ============================================================================

export interface RequestOptions {
  idempotencyKey?: string;
  timeout?: number;
  skipRetry?: boolean;
}

