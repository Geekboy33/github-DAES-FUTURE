/**
 * XCP B2B API - Complete Remittance Example
 * Demonstrates full flow: token → create remittance → poll status
 */

import 'dotenv/config';
import { XcpB2BClient, XcpApiError } from '../src/xcp-b2b';

async function main() {
  console.log('='.repeat(80));
  console.log('XCP B2B API - Remittance Example');
  console.log('='.repeat(80));
  console.log();

  try {
    // Initialize client (loads config from .env automatically)
    const client = new XcpB2BClient();
    const config = client.getConfig();
    
    console.log('✓ Client initialized');
    console.log(`  Base URL: ${config.XCP_BASE_URL}`);
    console.log(`  Account ID: ${config.XCP_ACCOUNT_ID}`);
    console.log();

    // Step 1: Obtain Access Token
    console.log('Step 1: Obtaining access token...');
    const tokenResponse = await client.getToken({
      accountId: config.XCP_ACCOUNT_ID,
      correspondentBankId: config.XCP_BANK_ID,
      permissionId: config.XCP_PERMISSION_ID,
      scope: 'remittance:write remittance:read account:read',
    });

    console.log('✓ Token obtained successfully');
    console.log(`  Permission ID: ${tokenResponse.permissionId}`);
    console.log(`  Expires in: ${tokenResponse.expires_in}s`);
    console.log(`  Scope: ${tokenResponse.scope}`);
    console.log();

    // Step 2: Check Account Balance (optional)
    try {
      console.log('Step 2: Checking account balance...');
      const balance = await client.getAccountBalance(config.XCP_ACCOUNT_ID);
      console.log('✓ Balance retrieved');
      console.log(`  Balance: ${balance.balance.value} ${balance.balance.currency}`);
      if (balance.availableBalance) {
        console.log(`  Available: ${balance.availableBalance.value} ${balance.availableBalance.currency}`);
      }
      console.log();
    } catch (error) {
      console.log('⚠ Balance check skipped (endpoint may not be available)');
      console.log();
    }

    // Step 3: Create Remittance
    console.log('Step 3: Creating remittance...');
    const remittance = await client.createRemittance({
      userId: 'user_xcp_demo_001',
      destinationAccountNumber: 'acc_demo_destination_456',
      amount: {
        value: 1000.00,
        currency: 'USD',
      },
      remittanceBankName: 'CoreBanking DAES',
      correspondentBankId: config.XCP_BANK_ID,
      bankId: config.XCP_BANK_ID,
      remittanceType: 'DEBIT',
      reference: `DEMO-${Date.now()}`,
      purposeCode: 'GDDS',
      orderingCustomer: {
        name: 'ACME Corporation LLC',
        iban: 'GB29NWBK60161331926819',
        bic: 'NWBKGB2L',
      },
      beneficiary: {
        name: 'Beta Trading SA',
        iban: 'DE89370400440532013000',
        bic: 'COBADEFF',
      },
      chargeBearer: 'SHARED',
      executionDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      urgent: false,
      additionalInfo: 'Payment for invoice DEMO-2025-001',
    });

    console.log('✓ Remittance created successfully');
    console.log(`  Transaction ID: ${remittance.transactionId}`);
    console.log(`  Status: ${remittance.status}`);
    console.log(`  Reference: ${remittance.reference}`);
    console.log(`  Created At: ${remittance.createdAt}`);
    console.log();

    // Step 4: Poll for Completion
    console.log('Step 4: Polling for completion...');
    console.log('  (This may take up to 2 minutes)');
    console.log();

    const finalStatus = await client.waitForRemittanceCompletion(remittance.transactionId, {
      maxAttempts: 24,        // 24 attempts
      intervalMs: 5000,       // Every 5 seconds
      timeoutMs: 120000,      // 2 minute timeout
    });

    console.log('✓ Remittance completed!');
    console.log(`  Final Status: ${finalStatus.status}`);
    console.log(`  Amount: ${finalStatus.amount.value} ${finalStatus.amount.currency}`);
    
    if (finalStatus.mt103Reference) {
      console.log(`  🏦 MT103 Reference: ${finalStatus.mt103Reference}`);
    }
    
    if (finalStatus.valueDate) {
      console.log(`  Value Date: ${finalStatus.valueDate}`);
    }
    
    if (finalStatus.fees) {
      console.log(`  Fees: ${finalStatus.fees.total} ${finalStatus.fees.currency}`);
    }
    
    if (finalStatus.completedAt) {
      console.log(`  Completed At: ${finalStatus.completedAt}`);
    }

    if (finalStatus.status === 'REJECTED' && finalStatus.rejectionReason) {
      console.log(`  ⚠ Rejection Reason: ${finalStatus.rejectionReason}`);
    }

    if (finalStatus.status === 'FAILED' && finalStatus.failureReason) {
      console.log(`  ❌ Failure Reason: ${finalStatus.failureReason}`);
    }

    console.log();
    console.log('='.repeat(80));
    console.log('✓ Example completed successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error();
    console.error('='.repeat(80));
    console.error('❌ Error occurred:');
    console.error('='.repeat(80));
    
    if (error instanceof XcpApiError) {
      console.error(`Code: ${error.code}`);
      console.error(`Message: ${error.message}`);
      console.error(`Status: ${error.status || 'N/A'}`);
      if (error.correlationId) {
        console.error(`Correlation ID: ${error.correlationId}`);
      }
      if (error.details) {
        console.error('Details:', JSON.stringify(error.details, null, 2));
      }
    } else if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error('Unknown error:', error);
    }
    
    console.error('='.repeat(80));
    process.exit(1);
  }
}

// Run example
main();

