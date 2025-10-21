/**
 * XCP B2B API Client
 * Main client class for all API operations
 */

import { AxiosInstance } from 'axios';
import { XcpConfig, getConfig, maskSecret } from './config';
import { createHttpClient, withRetry } from './http';
import {
  TokenRequest,
  TokenResponse,
  TokenResponseSchema,
  RemittanceRequest,
  RemittanceResponse,
  RemittanceResponseSchema,
  RemittanceDetail,
  RemittanceDetailSchema,
  WebhookRegistration,
  WebhookResponse,
  WebhookResponseSchema,
  StatementRequest,
  BalanceResponse,
  BalanceResponseSchema,
  RequestOptions,
  XcpApiError,
} from './types';

export class XcpB2BClient {
  private config: XcpConfig;
  private accessToken?: string;
  private tokenExpiresAt?: Date;
  
  // Separate HTTP clients for different auth requirements
  private httpToken: AxiosInstance;  // For token endpoint (uses API Key)
  private httpBiz: AxiosInstance;     // For business endpoints (uses JWT)

  constructor(config?: XcpConfig) {
    this.config = config || getConfig();
    
    // Token endpoint client: 30s timeout, no JWT
    this.httpToken = createHttpClient(
      this.config,
      undefined,
      this.config.XCP_TOKEN_TIMEOUT_MS
    );
    
    // Business endpoint client: 60s timeout, with JWT
    this.httpBiz = createHttpClient(
      this.config,
      () => this.accessToken,
      this.config.XCP_REQUEST_TIMEOUT_MS
    );
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  /**
   * Obtain JWT access token from XCP API
   * Uses API Key authentication (not JWT)
   */
  async getToken(request: TokenRequest): Promise<TokenResponse> {
    try {
      console.log('[XCP] Requesting access token...');
      
      const response = await withRetry(async () => {
        return await this.httpToken.post('/api-keys/token', request, {
          headers: {
            'Authorization': `Bearer ${this.config.XCP_API_KEY}`,
          },
        });
      }, {
        maxRetries: this.config.XCP_MAX_RETRIES,
        initialDelayMs: this.config.XCP_RETRY_DELAY_MS,
      });

      const validated = TokenResponseSchema.parse(response.data);
      
      // Auto-set token on this client
      this.setAccessToken(validated.access_token, validated.expires_in);
      
      console.log('[XCP] Token obtained successfully', {
        permissionId: validated.permissionId,
        expiresIn: validated.expires_in,
        scope: validated.scope,
      });
      
      return validated;
    } catch (error) {
      console.error('[XCP] Failed to obtain token:', error);
      throw error;
    }
  }

  /**
   * Manually set access token (if obtained externally)
   */
  setAccessToken(token: string, expiresInSeconds?: number): void {
    this.accessToken = token;
    
    if (expiresInSeconds) {
      this.tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    }
    
    console.log('[XCP] Access token set', {
      tokenPreview: maskSecret(token, 12),
      expiresAt: this.tokenExpiresAt?.toISOString(),
    });
  }

  /**
   * Check if current token is expired or about to expire
   */
  isTokenExpired(bufferSeconds = 60): boolean {
    if (!this.tokenExpiresAt) return true;
    return Date.now() >= this.tokenExpiresAt.getTime() - bufferSeconds * 1000;
  }

  /**
   * Ensure we have a valid token, refresh if needed
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || this.isTokenExpired()) {
      throw new XcpApiError(
        'TOKEN_EXPIRED',
        'Access token is missing or expired. Call getToken() first.',
        401
      );
    }
  }

  // ============================================================================
  // Remittance Operations
  // ============================================================================

  /**
   * Create a new remittance/transfer
   */
  async createRemittance(
    request: RemittanceRequest,
    options: RequestOptions = {}
  ): Promise<RemittanceResponse> {
    await this.ensureValidToken();

    try {
      console.log('[XCP] Creating remittance...', {
        amount: request.amount,
        reference: request.reference,
        type: request.remittanceType,
      });

      const headers: Record<string, string> = {};
      if (options.idempotencyKey) {
        headers['Idempotency-Key'] = options.idempotencyKey;
      }

      const response = await withRetry(async () => {
        return await this.httpBiz.post('/remittance', request, {
          headers,
          timeout: options.timeout,
        });
      }, {
        maxRetries: options.skipRetry ? 0 : this.config.XCP_MAX_RETRIES,
        initialDelayMs: this.config.XCP_RETRY_DELAY_MS,
      });

      const validated = RemittanceResponseSchema.parse(response.data);
      
      console.log('[XCP] Remittance created successfully', {
        transactionId: validated.transactionId,
        status: validated.status,
      });

      return validated;
    } catch (error) {
      console.error('[XCP] Failed to create remittance:', error);
      throw error;
    }
  }

  /**
   * Get remittance status/details by transaction ID
   */
  async getRemittance(transactionId: string): Promise<RemittanceDetail> {
    await this.ensureValidToken();

    try {
      const response = await withRetry(async () => {
        return await this.httpBiz.get(`/remittance/${transactionId}`);
      }, {
        maxRetries: this.config.XCP_MAX_RETRIES,
        initialDelayMs: this.config.XCP_RETRY_DELAY_MS,
      });

      const validated = RemittanceDetailSchema.parse(response.data);
      
      console.log('[XCP] Remittance status retrieved', {
        transactionId: validated.transactionId,
        status: validated.status,
        mt103Ref: validated.mt103Reference,
      });

      return validated;
    } catch (error) {
      console.error('[XCP] Failed to get remittance status:', error);
      throw error;
    }
  }

  /**
   * Poll remittance until it reaches a final state
   */
  async waitForRemittanceCompletion(
    transactionId: string,
    options: {
      maxAttempts?: number;
      intervalMs?: number;
      timeoutMs?: number;
    } = {}
  ): Promise<RemittanceDetail> {
    const {
      maxAttempts = 20,
      intervalMs = 5000,
      timeoutMs = 120000, // 2 minutes
    } = options;

    const startTime = Date.now();
    const finalStates = ['COMPLETED', 'REJECTED', 'FAILED', 'CANCELLED'];

    console.log('[XCP] Polling remittance status...', {
      transactionId,
      maxAttempts,
      intervalMs,
    });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new XcpApiError(
          'POLLING_TIMEOUT',
          `Remittance polling timed out after ${timeoutMs}ms`,
          408,
          undefined,
          { transactionId, attempts: attempt }
        );
      }

      const detail = await this.getRemittance(transactionId);
      
      console.log(`[XCP] Poll attempt ${attempt}/${maxAttempts}: ${detail.status}`);

      if (finalStates.includes(detail.status)) {
        console.log('[XCP] Remittance reached final state:', detail.status);
        return detail;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new XcpApiError(
      'MAX_ATTEMPTS_EXCEEDED',
      `Remittance did not complete after ${maxAttempts} attempts`,
      408,
      undefined,
      { transactionId }
    );
  }

  // ============================================================================
  // Webhook Management
  // ============================================================================

  /**
   * Register a webhook endpoint
   */
  async registerWebhook(webhook: WebhookRegistration): Promise<WebhookResponse> {
    await this.ensureValidToken();

    try {
      console.log('[XCP] Registering webhook...', {
        url: webhook.url,
        events: webhook.events,
      });

      const response = await withRetry(async () => {
        return await this.httpBiz.post('/webhooks', webhook);
      }, {
        maxRetries: this.config.XCP_MAX_RETRIES,
        initialDelayMs: this.config.XCP_RETRY_DELAY_MS,
      });

      const validated = WebhookResponseSchema.parse(response.data);
      
      console.log('[XCP] Webhook registered successfully', {
        webhookId: validated.webhookId,
        status: validated.status,
      });

      return validated;
    } catch (error) {
      console.error('[XCP] Failed to register webhook:', error);
      throw error;
    }
  }

  // ============================================================================
  // Account Operations
  // ============================================================================

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: string): Promise<BalanceResponse> {
    await this.ensureValidToken();

    try {
      const response = await withRetry(async () => {
        return await this.httpBiz.get(`/accounts/${accountId}/balance`);
      }, {
        maxRetries: this.config.XCP_MAX_RETRIES,
        initialDelayMs: this.config.XCP_RETRY_DELAY_MS,
      });

      const validated = BalanceResponseSchema.parse(response.data);
      
      console.log('[XCP] Balance retrieved', {
        accountId: validated.accountId,
        balance: validated.balance,
      });

      return validated;
    } catch (error) {
      console.error('[XCP] Failed to get balance:', error);
      throw error;
    }
  }

  /**
   * Request account statements for a date range
   */
  async getStatements(request: StatementRequest): Promise<any> {
    await this.ensureValidToken();

    try {
      console.log('[XCP] Requesting statements...', {
        from: request.from,
        to: request.to,
        format: request.format,
      });

      const response = await withRetry(async () => {
        return await this.httpBiz.post('/statements', request);
      }, {
        maxRetries: this.config.XCP_MAX_RETRIES,
        initialDelayMs: this.config.XCP_RETRY_DELAY_MS,
      });

      console.log('[XCP] Statements retrieved successfully');

      return response.data;
    } catch (error) {
      console.error('[XCP] Failed to get statements:', error);
      throw error;
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get current configuration (useful for debugging)
   */
  getConfig(): XcpConfig {
    return { ...this.config };
  }

  /**
   * Check if client has a valid token
   */
  hasValidToken(): boolean {
    return !!this.accessToken && !this.isTokenExpired();
  }
}

