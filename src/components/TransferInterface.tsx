import { useState, useEffect } from 'react';
import { Send, AlertCircle, CheckCircle, Key } from 'lucide-react';
import { bankingStore, Account } from '../lib/store';
import { CryptoUtils } from '../lib/crypto';
import { DTC1BParser } from '../lib/dtc1b-parser';

export function TransferInterface() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [hmacSignature, setHmacSignature] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setAccounts(bankingStore.getAccounts());
  }, []);

  useEffect(() => {
    generateHMAC();
  }, [fromAccountId, toAccountId, amount, reference, apiSecret]);

  const generateHMAC = async () => {
    if (!fromAccountId || !toAccountId || !amount || !reference || !apiSecret) {
      setHmacSignature('');
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const body = JSON.stringify({
        from_account: fromAccountId,
        to_account: toAccountId,
        amount: Math.round(parseFloat(amount) * 100),
        currency: accounts.find(a => a.id === fromAccountId)?.currencyISO,
        reference,
        timestamp
      });

      const payload = `POST|/transfer/send|${timestamp}|${body}`;
      const signature = await CryptoUtils.hmacSHA256(apiSecret, payload);
      setHmacSignature(signature);
    } catch (error) {
      console.error('HMAC generation failed:', error);
      setHmacSignature('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      if (!apiKey || !apiSecret) {
        throw new Error('API credentials required');
      }

      const keyValid = await bankingStore.verifyAPIKey(apiKey, apiSecret);
      if (!keyValid) {
        throw new Error('Invalid API credentials');
      }

      if (!keyValid.permissions.includes('transfer:write')) {
        throw new Error('Insufficient permissions');
      }

      const fromAccount = accounts.find(a => a.id === fromAccountId);
      if (!fromAccount) {
        throw new Error('Source account not found');
      }

      const amountMinorUnits = BigInt(Math.round(parseFloat(amount) * 100));

      const transfer = await bankingStore.createTransfer({
        fromAccountId,
        toAccountId,
        amountMinorUnits,
        currencyISO: fromAccount.currencyISO,
        reference,
        status: 'pending',
        metadata: {
          apiKeyId: keyValid.id,
          hmacSignature,
          timestamp: new Date().toISOString()
        },
        initiatedBy: keyValid.id
      });

      setResult({
        success: true,
        message: `Transfer ${transfer.id} completed successfully`
      });

      setFromAccountId('');
      setToAccountId('');
      setAmount('');
      setReference('');

      setAccounts(bankingStore.getAccounts());
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Transfer failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const fromAccount = accounts.find(a => a.id === fromAccountId);
  const toAccount = accounts.find(a => a.id === toAccountId);
  const amountValue = parseFloat(amount) || 0;
  const amountMinorUnits = BigInt(Math.round(amountValue * 100));

  const canSubmit = fromAccountId && toAccountId && amount && reference && apiKey && apiSecret &&
    fromAccountId !== toAccountId &&
    amountValue > 0 &&
    fromAccount &&
    fromAccount.balanceMinorUnits >= amountMinorUnits;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-[#0d0d0d] rounded-lg border border-[#1a1a1a] overflow-hidden">
        <div className="p-6 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Send className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Secure Transfer</h2>
              <p className="text-sm text-slate-400">HMAC-authenticated fund transfer</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                From Account
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select account...</option>
                {accounts.filter(a => a.status === 'active').map(account => (
                  <option key={account.id} value={account.id}>
                    {account.accountRef} - {DTC1BParser.formatAmount(account.balanceMinorUnits, account.currencyISO)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                To Account
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select account...</option>
                {accounts.filter(a => a.status === 'active' && a.id !== fromAccountId).map(account => (
                  <option key={account.id} value={account.id}>
                    {account.accountRef} ({account.currencyISO})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Amount {fromAccount && `(${fromAccount.currencyISO})`}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {fromAccount && amountValue > 0 && (
              <div className="mt-2 text-xs text-slate-400">
                Remaining balance: {DTC1BParser.formatAmount(
                  fromAccount.balanceMinorUnits - amountMinorUnits,
                  fromAccount.currencyISO
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="TX-20251015-0001"
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="border-t border-[#1a1a1a] pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">API Authentication</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API Key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_..."
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API Secret
                </label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="sk_..."
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  required
                />
              </div>

              {hmacSignature && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    HMAC-SHA256 Signature
                  </label>
                  <div className="bg-black p-3 rounded border border-slate-600">
                    <code className="text-xs text-green-400 break-all">{hmacSignature}</code>
                  </div>
                </div>
              )}
            </div>
          </div>

          {result && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              result.success ? 'bg-green-900/20 border border-green-700' : 'bg-red-900/20 border border-red-700'
            }`}>
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                  {result.message}
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>Processing...</>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Execute Transfer
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
