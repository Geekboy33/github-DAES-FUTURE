import { getSupabaseClient } from './supabase-client';
import { CurrencyBalance } from './balances-store';

const supabase = getSupabaseClient();

export interface LedgerAccount {
  id: string;
  userId: string;
  currency: string;
  accountName: string;
  accountNumber: string;
  balance: number;
  transactionCount: number;
  averageTransaction: number;
  largestTransaction: number;
  smallestTransaction: number;
  status: 'active' | 'frozen' | 'closed';
  lastUpdated: string;
  createdAt: string;
  metadata?: any;
}

export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CHF', 'CAD',
  'AUD', 'JPY', 'CNY', 'INR', 'MXN',
  'BRL', 'RUB', 'KRW', 'SGD', 'HKD'
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

class LedgerAccountsStore {
  private currentUserId: string | null = null;
  private userIdPromise: Promise<string | null>;
  private accountsCache: Map<string, LedgerAccount> = new Map();
  private listeners: Set<(accounts: LedgerAccount[]) => void> = new Set();

  constructor() {
    this.userIdPromise = this.initializeUser();
  }

  private async initializeUser(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      this.currentUserId = user?.id || null;
      return this.currentUserId;
    } catch (error) {
      console.error('[LedgerAccountsStore] Error getting user:', error);
      return null;
    }
  }

  private async ensureUserId(): Promise<string | null> {
    if (this.currentUserId) return this.currentUserId;
    return await this.userIdPromise;
  }

  async initializeAllAccounts(): Promise<LedgerAccount[]> {
    const userId = await this.ensureUserId();
    if (!userId) {
      console.warn('[LedgerAccountsStore] No user ID, cannot initialize accounts');
      return [];
    }

    try {
      const { data: existingAccounts, error } = await supabase
        .from('ledger_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('currency', { ascending: true });

      if (error) throw error;

      const existingCurrencies = new Set(existingAccounts?.map(acc => acc.currency) || []);
      const missingCurrencies = SUPPORTED_CURRENCIES.filter(curr => !existingCurrencies.has(curr));

      if (missingCurrencies.length > 0) {
        console.log('[LedgerAccountsStore] Creating missing accounts:', missingCurrencies);

        const newAccounts = missingCurrencies.map(currency => ({
          user_id: userId,
          currency,
          account_name: this.getCurrencyAccountName(currency),
          account_number: this.generateAccountNumber(currency),
          balance: 0,
          transaction_count: 0,
          average_transaction: 0,
          largest_transaction: 0,
          smallest_transaction: 0,
          status: 'active',
          metadata: {
            initialized: new Date().toISOString(),
            source: 'auto-created'
          }
        }));

        const { data: created, error: createError } = await supabase
          .from('ledger_accounts')
          .insert(newAccounts)
          .select();

        if (createError) throw createError;

        const allAccounts = [...(existingAccounts || []), ...(created || [])];
        this.cacheAccounts(allAccounts);
        return this.mapAccounts(allAccounts);
      }

      this.cacheAccounts(existingAccounts || []);
      return this.mapAccounts(existingAccounts || []);
    } catch (error) {
      console.error('[LedgerAccountsStore] Error initializing accounts:', error);
      return [];
    }
  }

  async getAllAccounts(forceRefresh = false): Promise<LedgerAccount[]> {
    const userId = await this.ensureUserId();
    if (!userId) return [];

    if (!forceRefresh && this.accountsCache.size > 0) {
      return this.getOrderedAccounts(Array.from(this.accountsCache.values()));
    }

    try {
      const { data, error } = await supabase
        .from('ledger_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('currency', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        return await this.initializeAllAccounts();
      }

      this.cacheAccounts(data);
      return this.getOrderedAccounts(this.mapAccounts(data));
    } catch (error) {
      console.error('[LedgerAccountsStore] Error getting accounts:', error);
      return [];
    }
  }

  async getAccountByCurrency(currency: string): Promise<LedgerAccount | null> {
    const accounts = await this.getAllAccounts();
    return accounts.find(acc => acc.currency === currency) || null;
  }

  async updateAccountFromBalance(balance: CurrencyBalance): Promise<boolean> {
    const userId = await this.ensureUserId();
    if (!userId) return false;

    try {
      const currentBalance = await this.getCurrentBalance(balance.currency);

      const { error } = await supabase
        .from('ledger_accounts')
        .update({
          balance: currentBalance,
          transaction_count: balance.transactionCount,
          average_transaction: balance.averageTransaction,
          largest_transaction: balance.largestTransaction,
          smallest_transaction: balance.smallestTransaction === Infinity ? 0 : balance.smallestTransaction,
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('currency', balance.currency);

      if (error) throw error;

      await this.getAllAccounts(true);
      this.notifyListeners();

      console.log('[LedgerAccountsStore] Account updated:', balance.currency, currentBalance);
      return true;
    } catch (error) {
      console.error('[LedgerAccountsStore] Error updating account:', error);
      return false;
    }
  }

  async updateMultipleAccounts(balances: CurrencyBalance[]): Promise<boolean> {
    const userId = await this.ensureUserId();
    if (!userId) return false;

    try {
      for (const balance of balances) {
        await this.updateAccountFromBalance(balance);
      }

      await this.getAllAccounts(true);
      this.notifyListeners();

      console.log('[LedgerAccountsStore] Multiple accounts updated:', balances.length);
      return true;
    } catch (error) {
      console.error('[LedgerAccountsStore] Error updating multiple accounts:', error);
      return false;
    }
  }

  async getCurrentBalance(currency: string): Promise<number> {
    const userId = await this.ensureUserId();
    if (!userId) return 0;

    try {
      const { data, error } = await supabase
        .rpc('get_ledger_account_balance', {
          p_user_id: userId,
          p_currency: currency
        });

      if (error) {
        const account = await this.getAccountByCurrency(currency);
        return account?.balance || 0;
      }

      return parseFloat(data) || 0;
    } catch (error) {
      console.error('[LedgerAccountsStore] Error getting current balance:', error);
      const account = await this.getAccountByCurrency(currency);
      return account?.balance || 0;
    }
  }

  async updateAccountStatus(currency: string, status: 'active' | 'frozen' | 'closed'): Promise<boolean> {
    const userId = await this.ensureUserId();
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('ledger_accounts')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('currency', currency);

      if (error) throw error;

      await this.getAllAccounts(true);
      this.notifyListeners();

      console.log('[LedgerAccountsStore] Account status updated:', currency, status);
      return true;
    } catch (error) {
      console.error('[LedgerAccountsStore] Error updating status:', error);
      return false;
    }
  }

  subscribe(listener: (accounts: LedgerAccount[]) => void): () => void {
    this.listeners.add(listener);

    this.getAllAccounts().then(accounts => {
      listener(accounts);
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const accounts = this.getOrderedAccounts(Array.from(this.accountsCache.values()));
    this.listeners.forEach(listener => {
      try {
        listener(accounts);
      } catch (error) {
        console.error('[LedgerAccountsStore] Error in listener:', error);
      }
    });
  }

  private cacheAccounts(accounts: any[]): void {
    this.accountsCache.clear();
    accounts.forEach(acc => {
      this.accountsCache.set(acc.currency, this.mapAccount(acc));
    });
  }

  private getOrderedAccounts(accounts: LedgerAccount[]): LedgerAccount[] {
    return accounts.sort((a, b) => {
      const indexA = SUPPORTED_CURRENCIES.indexOf(a.currency as SupportedCurrency);
      const indexB = SUPPORTED_CURRENCIES.indexOf(b.currency as SupportedCurrency);
      return indexA - indexB;
    });
  }

  private mapAccount(data: any): LedgerAccount {
    return {
      id: data.id,
      userId: data.user_id,
      currency: data.currency,
      accountName: data.account_name,
      accountNumber: data.account_number,
      balance: parseFloat(data.balance) || 0,
      transactionCount: data.transaction_count || 0,
      averageTransaction: parseFloat(data.average_transaction) || 0,
      largestTransaction: parseFloat(data.largest_transaction) || 0,
      smallestTransaction: parseFloat(data.smallest_transaction) || 0,
      status: data.status || 'active',
      lastUpdated: data.last_updated || data.updated_at,
      createdAt: data.created_at,
      metadata: data.metadata
    };
  }

  private mapAccounts(data: any[]): LedgerAccount[] {
    return data.map(d => this.mapAccount(d));
  }

  private getCurrencyAccountName(currency: string): string {
    const names: { [key: string]: string } = {
      'USD': 'US Dollar Account',
      'EUR': 'Euro Account',
      'GBP': 'British Pound Account',
      'CHF': 'Swiss Franc Account',
      'CAD': 'Canadian Dollar Account',
      'AUD': 'Australian Dollar Account',
      'JPY': 'Japanese Yen Account',
      'CNY': 'Chinese Yuan Account',
      'INR': 'Indian Rupee Account',
      'MXN': 'Mexican Peso Account',
      'BRL': 'Brazilian Real Account',
      'RUB': 'Russian Ruble Account',
      'KRW': 'South Korean Won Account',
      'SGD': 'Singapore Dollar Account',
      'HKD': 'Hong Kong Dollar Account',
    };
    return names[currency] || `${currency} Account`;
  }

  private generateAccountNumber(currency: string): string {
    const prefix = currency.substring(0, 2);
    const random = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    return `${prefix}${random}`;
  }

  clearCache(): void {
    this.accountsCache.clear();
    console.log('[LedgerAccountsStore] Cache cleared');
  }
}

export const ledgerAccountsStore = new LedgerAccountsStore();
