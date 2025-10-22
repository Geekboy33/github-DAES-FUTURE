import { createClient } from '@supabase/supabase-js';
import { CurrencyBalance } from './balances-store';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface Transaction {
  id: string;
  userId: string;
  fileHash: string;
  fileName: string;
  transactionType: 'debit' | 'credit';
  currency: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  recipientAddress?: string;
  recipientName?: string;
  description?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  apiProvider?: string;
  transactionHash?: string;
  fee: number;
  errorMessage?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface FileAccount {
  fileHash: string;
  fileName: string;
  fileSize: number;
  balances: CurrencyBalance[];
  totalValue?: number;
  lastUpdated: string;
}

class TransactionsStore {
  private currentUserId: string | null = null;
  private userIdPromise: Promise<string | null>;

  constructor() {
    this.userIdPromise = this.initializeUser();
  }

  private async initializeUser(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      this.currentUserId = user?.id || null;
      return this.currentUserId;
    } catch (error) {
      console.error('[TransactionsStore] Error getting user:', error);
      return null;
    }
  }

  private async ensureUserId(): Promise<string | null> {
    if (this.currentUserId) return this.currentUserId;
    return await this.userIdPromise;
  }

  async getAvailableAccounts(): Promise<FileAccount[]> {
    const userId = await this.ensureUserId();
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('currency_balances')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) return [];

      const accountsMap = new Map<string, FileAccount>();

      for (const balance of data) {
        const fileHash = balance.file_hash;

        if (!accountsMap.has(fileHash)) {
          accountsMap.set(fileHash, {
            fileHash: balance.file_hash,
            fileName: balance.file_name,
            fileSize: balance.file_size,
            balances: [],
            lastUpdated: balance.updated_at
          });
        }

        const account = accountsMap.get(fileHash)!;

        const currentBalance = await this.getCurrentBalance(fileHash, balance.currency);

        account.balances.push({
          currency: balance.currency,
          accountName: balance.account_name,
          totalAmount: currentBalance,
          transactionCount: balance.transaction_count,
          averageTransaction: parseFloat(balance.average_transaction),
          largestTransaction: parseFloat(balance.largest_transaction),
          smallestTransaction: parseFloat(balance.smallest_transaction),
          amounts: balance.amounts || [],
          lastUpdated: balance.last_updated
        });
      }

      return Array.from(accountsMap.values());
    } catch (error) {
      console.error('[TransactionsStore] Error loading accounts:', error);
      return [];
    }
  }

  async getCurrentBalance(fileHash: string, currency: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_current_balance', {
          p_file_hash: fileHash,
          p_currency: currency
        });

      if (error) throw error;
      return parseFloat(data) || 0;
    } catch (error) {
      console.error('[TransactionsStore] Error getting current balance:', error);

      const { data } = await supabase
        .from('currency_balances')
        .select('total_amount')
        .eq('file_hash', fileHash)
        .eq('currency', currency)
        .eq('status', 'completed')
        .maybeSingle();

      return data ? parseFloat(data.total_amount) : 0;
    }
  }

  async validateSufficientFunds(
    fileHash: string,
    currency: string,
    amount: number,
    fee: number = 0
  ): Promise<{ valid: boolean; currentBalance: number; required: number }> {
    try {
      const { data, error } = await supabase
        .rpc('validate_sufficient_funds', {
          p_file_hash: fileHash,
          p_currency: currency,
          p_amount: amount,
          p_fee: fee
        });

      if (error) throw error;

      const currentBalance = await this.getCurrentBalance(fileHash, currency);
      const required = amount + fee;

      return {
        valid: data === true,
        currentBalance,
        required
      };
    } catch (error) {
      console.error('[TransactionsStore] Error validating funds:', error);
      const currentBalance = await this.getCurrentBalance(fileHash, currency);
      const required = amount + fee;

      return {
        valid: currentBalance >= required,
        currentBalance,
        required
      };
    }
  }

  async createDebitTransaction(
    fileHash: string,
    fileName: string,
    currency: string,
    amount: number,
    recipientAddress: string,
    recipientName: string,
    description: string,
    fee: number = 0,
    apiProvider?: string
  ): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
    const userId = await this.ensureUserId();
    if (!userId) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    try {
      const validation = await this.validateSufficientFunds(fileHash, currency, amount, fee);

      if (!validation.valid) {
        return {
          success: false,
          error: `Fondos insuficientes. Disponible: ${validation.currentBalance} ${currency}, Requerido: ${validation.required} ${currency}`
        };
      }

      const balanceBefore = validation.currentBalance;
      const balanceAfter = balanceBefore - amount - fee;

      const transactionData = {
        user_id: userId,
        file_hash: fileHash,
        file_name: fileName,
        transaction_type: 'debit',
        currency: currency,
        amount: amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        recipient_address: recipientAddress,
        recipient_name: recipientName,
        description: description,
        status: 'pending',
        api_provider: apiProvider,
        fee: fee,
        metadata: {
          validatedAt: new Date().toISOString(),
          originalBalance: balanceBefore
        }
      };

      const { data, error } = await supabase
        .from('transactions_history')
        .insert([transactionData])
        .select()
        .single();

      if (error) throw error;

      console.log('[TransactionsStore] Débito registrado:', data.id, amount, currency);

      return {
        success: true,
        transaction: this.mapTransaction(data)
      };
    } catch (error) {
      console.error('[TransactionsStore] Error creating debit:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async updateTransactionStatus(
    transactionId: string,
    status: 'completed' | 'failed' | 'cancelled',
    transactionHash?: string,
    errorMessage?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString()
      };

      if (transactionHash) {
        updateData.transaction_hash = transactionHash;
      }

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      const { error } = await supabase
        .from('transactions_history')
        .update(updateData)
        .eq('id', transactionId);

      if (error) throw error;

      console.log('[TransactionsStore] Transaction status updated:', transactionId, status);
      return true;
    } catch (error) {
      console.error('[TransactionsStore] Error updating transaction:', error);
      return false;
    }
  }

  async getTransactionHistory(
    fileHash?: string,
    limit: number = 50
  ): Promise<Transaction[]> {
    const userId = await this.ensureUserId();
    if (!userId) return [];

    try {
      let query = supabase
        .from('transactions_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fileHash) {
        query = query.eq('file_hash', fileHash);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(this.mapTransaction);
    } catch (error) {
      console.error('[TransactionsStore] Error loading transaction history:', error);
      return [];
    }
  }

  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('transactions_history')
        .select('*')
        .eq('id', transactionId)
        .maybeSingle();

      if (error) throw error;

      return data ? this.mapTransaction(data) : null;
    } catch (error) {
      console.error('[TransactionsStore] Error loading transaction:', error);
      return null;
    }
  }

  async getTransactionsSummary(fileHash: string): Promise<{
    totalDebits: number;
    totalCredits: number;
    totalFees: number;
    transactionCount: number;
    pendingCount: number;
    completedCount: number;
    failedCount: number;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('get_file_transactions_summary', {
          p_file_hash: fileHash
        });

      if (error) throw error;

      if (data && data.length > 0) {
        const summary = data[0];
        return {
          totalDebits: parseFloat(summary.total_debits) || 0,
          totalCredits: parseFloat(summary.total_credits) || 0,
          totalFees: parseFloat(summary.total_fees) || 0,
          transactionCount: parseInt(summary.transaction_count) || 0,
          pendingCount: parseInt(summary.pending_count) || 0,
          completedCount: parseInt(summary.completed_count) || 0,
          failedCount: parseInt(summary.failed_count) || 0
        };
      }

      return {
        totalDebits: 0,
        totalCredits: 0,
        totalFees: 0,
        transactionCount: 0,
        pendingCount: 0,
        completedCount: 0,
        failedCount: 0
      };
    } catch (error) {
      console.error('[TransactionsStore] Error getting summary:', error);
      return {
        totalDebits: 0,
        totalCredits: 0,
        totalFees: 0,
        transactionCount: 0,
        pendingCount: 0,
        completedCount: 0,
        failedCount: 0
      };
    }
  }

  private mapTransaction(data: any): Transaction {
    return {
      id: data.id,
      userId: data.user_id,
      fileHash: data.file_hash,
      fileName: data.file_name,
      transactionType: data.transaction_type,
      currency: data.currency,
      amount: parseFloat(data.amount),
      balanceBefore: parseFloat(data.balance_before),
      balanceAfter: parseFloat(data.balance_after),
      recipientAddress: data.recipient_address,
      recipientName: data.recipient_name,
      description: data.description,
      status: data.status,
      apiProvider: data.api_provider,
      transactionHash: data.transaction_hash,
      fee: parseFloat(data.fee) || 0,
      errorMessage: data.error_message,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export const transactionsStore = new TransactionsStore();
