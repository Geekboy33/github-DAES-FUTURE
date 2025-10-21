# XCP B2B API Client

Enterprise-grade TypeScript client for XCP B2B Remittance API integration with full mTLS support, HMAC request signing, and comprehensive error handling.

## 🔒 Security Features

- ✅ **mTLS (Mutual TLS)**: TLS ≥ 1.2 with client certificate authentication
- ✅ **HMAC-SHA256 Request Signing**: All requests cryptographically signed
- ✅ **Anti-Replay Protection**: Timestamp validation (±5 minute window)
- ✅ **Idempotency**: Automatic UUID-based idempotency keys
- ✅ **JWT Bearer Authentication**: Secure token-based API access
- ✅ **Exponential Backoff Retry**: Intelligent retry logic for transient failures

## 📦 Installation

```bash
npm install
```

Required dependencies:
- `axios` - HTTP client
- `zod` - Schema validation
- `uuid` - Idempotency key generation
- `dotenv` - Environment configuration

## 🚀 Quick Start

### 1. Configuration

Copy `.env.example` to `.env` in your project root:

```bash
cp src/xcp-b2b/.env.example .env
```

Fill in your credentials:

```env
XCP_BASE_URL=https://b2bapi.sandbox.xcpbank.com
XCP_API_KEY=your-api-key
XCP_API_SECRET=your-api-secret
XCP_ACCOUNT_ID=acc_123
XCP_ACCOUNT_HOLDER_ID=ah_789
XCP_BANK_ID=bank_abc
XCP_PERMISSION_ID=perm_remit

# Certificate paths
XCP_CLIENT_CERT_PATH=./certs/client.crt
XCP_CLIENT_KEY_PATH=./certs/client.key
XCP_CA_CERT_PATH=./certs/ca-chain.pem
```

### 2. Basic Usage

```typescript
import { XcpB2BClient } from './xcp-b2b';

const client = new XcpB2BClient();

// Get access token
await client.getToken({
  accountId: 'acc_123',
  correspondentBankId: 'bank_abc',
  permissionId: 'perm_remit',
  scope: 'remittance:write remittance:read'
});

// Create remittance
const result = await client.createRemittance({
  userId: 'user_001',
  destinationAccountNumber: 'acc_456',
  amount: { value: 1000.00, currency: 'USD' },
  remittanceBankName: 'Your Bank',
  correspondentBankId: 'bank_abc',
  bankId: 'xcp_main',
  remittanceType: 'DEBIT',
  reference: 'INV-2025-0001',
  purposeCode: 'GDDS'
});

console.log('Transaction ID:', result.transactionId);
```

## 📚 API Reference

### Client Methods

#### `getToken(request: TokenRequest): Promise<TokenResponse>`
Obtain JWT access token from the API.

```typescript
const token = await client.getToken({
  accountId: 'acc_123',
  correspondentBankId: 'bank_abc',
  permissionId: 'perm_remit',
  scope: 'remittance:write remittance:read'
});
```

#### `createRemittance(request: RemittanceRequest, options?: RequestOptions): Promise<RemittanceResponse>`
Create a new remittance/transfer.

```typescript
const remittance = await client.createRemittance({
  userId: 'user_001',
  destinationAccountNumber: 'acc_456',
  amount: { value: 1000.00, currency: 'USD' },
  remittanceBankName: 'Your Bank',
  correspondentBankId: 'bank_abc',
  bankId: 'xcp_main',
  remittanceType: 'DEBIT',
  reference: 'INV-2025-0001',
  purposeCode: 'GDDS',
  orderingCustomer: {
    name: 'ACME LLC',
    iban: 'GB29NWBK60161331926819',
    bic: 'NWBKGB2L'
  },
  beneficiary: {
    name: 'Beta SA',
    iban: 'DE89370400440532013000',
    bic: 'COBADEFF'
  },
  chargeBearer: 'SHARED',
  urgent: false
}, {
  idempotencyKey: 'custom-uuid-if-needed'
});
```

#### `getRemittance(transactionId: string): Promise<RemittanceDetail>`
Get remittance status and details.

```typescript
const detail = await client.getRemittance('xcp_trx_9f3e...');
console.log('Status:', detail.status);
console.log('MT103 Ref:', detail.mt103Reference);
```

#### `waitForRemittanceCompletion(transactionId: string, options?): Promise<RemittanceDetail>`
Poll remittance until it reaches a final state (COMPLETED, REJECTED, FAILED, CANCELLED).

```typescript
const final = await client.waitForRemittanceCompletion('xcp_trx_9f3e...', {
  maxAttempts: 24,
  intervalMs: 5000,
  timeoutMs: 120000
});
```

#### `registerWebhook(webhook: WebhookRegistration): Promise<WebhookResponse>`
Register a webhook endpoint for event notifications.

```typescript
const webhook = await client.registerWebhook({
  url: 'https://your-bank.com/webhooks',
  events: [
    'remittance.completed',
    'remittance.rejected',
    'remittance.failed'
  ],
  hmacSecret: 'base64-encoded-secret',
  retryPolicy: {
    maxRetries: 5,
    backoffStrategy: 'exponential',
    maxDelaySeconds: 300
  }
});
```

#### `getAccountBalance(accountId: string): Promise<BalanceResponse>`
Get current account balance.

```typescript
const balance = await client.getAccountBalance('acc_123');
console.log(`Balance: ${balance.balance.value} ${balance.balance.currency}`);
```

#### `getStatements(request: StatementRequest): Promise<any>`
Request account statements for a date range.

```typescript
const statements = await client.getStatements({
  from: '2025-01-01',
  to: '2025-01-31',
  format: 'JSON'
});
```

## 🔐 Request Signing

All requests are automatically signed using HMAC-SHA256:

```
Canonical Request = METHOD + "\n" +
                   PATH + "\n" +
                   SHA256(REQUEST_BODY) + "\n" +
                   X-REQUEST-TIMESTAMP

Signature = base64(HMAC-SHA256(Canonical Request, API_SECRET))
```

Headers automatically added:
- `X-REQUEST-TIMESTAMP`: RFC3339 UTC timestamp
- `X-REQUEST-SIGNATURE`: HMAC signature
- `Idempotency-Key`: UUIDv4
- `X-ACCOUNT-HOLDER-ID`: From config
- `Authorization`: Bearer JWT (after token obtained)

## 🔄 Retry Logic

Automatic exponential backoff retry for:
- HTTP 5xx errors
- HTTP 429 (Rate Limit)
- Network timeouts
- Connection errors

**Not retried**:
- HTTP 4xx errors (except 429)
- Validation errors
- Authentication failures

## 🎯 Error Handling

```typescript
import { XcpApiError } from './xcp-b2b';

try {
  await client.createRemittance(request);
} catch (error) {
  if (error instanceof XcpApiError) {
    console.error('API Error:', error.code);
    console.error('Message:', error.message);
    console.error('Status:', error.status);
    console.error('Correlation ID:', error.correlationId);
  }
}
```

## 📝 Examples

Run the complete example:

```bash
npm run xcp:remit
```

Or directly with tsx:

```bash
npx tsx examples/xcp-remit-example.ts
```

## 🧪 Testing

Create test certificates for development:

```bash
# Generate self-signed certificates (for sandbox/testing only)
openssl req -x509 -newkey rsa:4096 -keyout certs/client.key -out certs/client.crt -days 365 -nodes
```

## 📋 Supported Operations

- ✅ Token Management (JWT)
- ✅ Remittance Creation (DEBIT/CREDIT)
- ✅ Remittance Status Polling
- ✅ Webhook Registration
- ✅ Account Balance Inquiry
- ✅ Statement Requests (JSON/MT940/CSV)

## 🏗️ Architecture

```
src/xcp-b2b/
├── config.ts        # Environment configuration & validation
├── signature.ts     # HMAC signing utilities
├── http.ts          # Axios client with mTLS & interceptors
├── types.ts         # Zod schemas & TypeScript types
├── client.ts        # Main XcpB2BClient class
├── index.ts         # Public API exports
└── README.md        # This file
```

## 🔧 Configuration Options

| Variable | Required | Description |
|----------|----------|-------------|
| `XCP_BASE_URL` | ✅ | API base URL |
| `XCP_API_KEY` | ✅ | API key for token endpoint |
| `XCP_API_SECRET` | ✅ | Secret for HMAC signing |
| `XCP_ACCOUNT_ID` | ✅ | Your account ID |
| `XCP_ACCOUNT_HOLDER_ID` | ✅ | Account holder ID |
| `XCP_BANK_ID` | ✅ | Bank/correspondent ID |
| `XCP_PERMISSION_ID` | ✅ | Permission ID |
| `XCP_CLIENT_CERT_PATH` | ✅ | Client certificate path |
| `XCP_CLIENT_KEY_PATH` | ✅ | Client key path |
| `XCP_CA_CERT_PATH` | ✅ | CA certificate path |
| `XCP_TOKEN_TIMEOUT_MS` | ❌ | Token endpoint timeout (default: 30000) |
| `XCP_REQUEST_TIMEOUT_MS` | ❌ | Request timeout (default: 60000) |
| `XCP_MAX_RETRIES` | ❌ | Max retry attempts (default: 3) |
| `XCP_RETRY_DELAY_MS` | ❌ | Initial retry delay (default: 1000) |
| `XCP_DEBUG` | ❌ | Enable debug logging (default: false) |

## 🛡️ Best Practices

1. **Never commit secrets**: Keep `.env` out of version control
2. **Use environment-specific configs**: Different values for dev/staging/prod
3. **Rotate credentials regularly**: Update API keys and certificates periodically
4. **Monitor token expiration**: Implement automatic token refresh
5. **Log correlation IDs**: Include correlation IDs in your logging for debugging
6. **Implement webhook validation**: Verify HMAC signatures on incoming webhooks
7. **Handle idempotency**: Use consistent idempotency keys for critical operations

## 📞 Support

For API documentation and support, contact XCP B2B API support.

## 📄 License

Proprietary - Internal Use Only

