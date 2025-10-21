/**
 * Global Balance Store - Persistent Storage for Analyzed Balances
 * Manages balances from Large File DTC1B Analyzer
 */

export interface CurrencyBalance {
  currency: string;
  accountName: string;
  totalAmount: number;
  transactionCount: number;
  lastUpdated: number;
  amounts: number[];
  largestTransaction: number;
  smallestTransaction: number;
  averageTransaction: number;
}

export interface BalanceStoreData {
  balances: CurrencyBalance[];
  lastScanDate: string;
  fileName: string;
  fileSize: number;
  totalTransactions: number;
}

const STORAGE_KEY = 'dtc1b_analyzed_balances';

/**
 * Global Balance Store Class
 */
class BalanceStore {
  private listeners: Set<(balances: CurrencyBalance[]) => void> = new Set();

  /**
   * Save balances to localStorage
   */
  saveBalances(data: BalanceStoreData): void {
    try {
      // Order balances: USD, EUR, GBP, CHF, then rest by amount
      const orderedBalances = this.orderBalances(data.balances);
      
      const storeData: BalanceStoreData = {
        ...data,
        balances: orderedBalances,
        lastScanDate: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));
      
      console.log('[BalanceStore] Saved balances:', {
        currencies: orderedBalances.length,
        totalTransactions: data.totalTransactions,
        fileName: data.fileName,
      });

      // Notify listeners
      this.notifyListeners(orderedBalances);
    } catch (error) {
      console.error('[BalanceStore] Error saving balances:', error);
    }
  }

  /**
   * Load balances from localStorage
   */
  loadBalances(): BalanceStoreData | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const data: BalanceStoreData = JSON.parse(stored);
      
      console.log('[BalanceStore] Loaded balances:', {
        currencies: data.balances.length,
        lastScan: data.lastScanDate,
        fileName: data.fileName,
      });

      return data;
    } catch (error) {
      console.error('[BalanceStore] Error loading balances:', error);
      return null;
    }
  }

  /**
   * Get balances array only
   */
  getBalances(): CurrencyBalance[] {
    const data = this.loadBalances();
    return data ? data.balances : [];
  }

  /**
   * Clear all balances
   */
  clearBalances(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[BalanceStore] Cleared balances');
      this.notifyListeners([]);
    } catch (error) {
      console.error('[BalanceStore] Error clearing balances:', error);
    }
  }

  /**
   * Order balances by currency priority
   */
  private orderBalances(balances: CurrencyBalance[]): CurrencyBalance[] {
    return balances.sort((a, b) => {
      // Priority order
      const priority: { [key: string]: number } = {
        'USD': 1,
        'EUR': 2,
        'GBP': 3,
        'CHF': 4,
        'CAD': 5,
        'AUD': 6,
        'JPY': 7,
        'CNY': 8,
        'INR': 9,
        'MXN': 10,
        'BRL': 11,
        'RUB': 12,
        'KRW': 13,
        'SGD': 14,
        'HKD': 15,
      };

      const priorityA = priority[a.currency] || 999;
      const priorityB = priority[b.currency] || 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If same priority, order by amount (descending)
      return b.totalAmount - a.totalAmount;
    });
  }

  /**
   * Get balance for specific currency
   */
  getBalanceForCurrency(currency: string): CurrencyBalance | null {
    const balances = this.getBalances();
    return balances.find(b => b.currency === currency) || null;
  }

  /**
   * Get total value across all balances (in USD equivalent - simplified)
   */
  getTotalValue(): number {
    const balances = this.getBalances();
    return balances.reduce((sum, b) => sum + b.totalAmount, 0);
  }

  /**
   * Subscribe to balance changes
   */
  subscribe(listener: (balances: CurrencyBalance[]) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current balances
    listener(this.getBalances());
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(balances: CurrencyBalance[]): void {
    this.listeners.forEach(listener => {
      try {
        listener(balances);
      } catch (error) {
        console.error('[BalanceStore] Error in listener:', error);
      }
    });
  }

  /**
   * Check if balances exist
   */
  hasBalances(): boolean {
    return this.getBalances().length > 0;
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const data = this.loadBalances();
    if (!data) return null;

    return {
      totalCurrencies: data.balances.length,
      totalTransactions: data.totalTransactions,
      lastScanDate: data.lastScanDate,
      fileName: data.fileName,
      fileSize: data.fileSize,
      currencies: data.balances.map(b => b.currency),
    };
  }

  /**
   * Export balances as JSON
   */
  exportBalances(): string {
    const data = this.loadBalances();
    if (!data) return '{}';
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import balances from JSON
   */
  importBalances(json: string): boolean {
    try {
      const data: BalanceStoreData = JSON.parse(json);
      this.saveBalances(data);
      return true;
    } catch (error) {
      console.error('[BalanceStore] Error importing balances:', error);
      return false;
    }
  }
}

// Export singleton instance
export const balanceStore = new BalanceStore();

// Helper function to format currency
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// Helper to get currency name
export function getCurrencyName(currency: string): string {
  const names: { [key: string]: string } = {
    'USD': 'Dólares Estadounidenses',
    'EUR': 'Euros',
    'GBP': 'Libras Esterlinas',
    'CHF': 'Francos Suizos',
    'CAD': 'Dólares Canadienses',
    'AUD': 'Dólares Australianos',
    'JPY': 'Yenes Japoneses',
    'CNY': 'Yuan Chino',
    'INR': 'Rupias Indias',
    'MXN': 'Pesos Mexicanos',
    'BRL': 'Reales Brasileños',
    'RUB': 'Rublos Rusos',
    'KRW': 'Won Surcoreano',
    'SGD': 'Dólares de Singapur',
    'HKD': 'Dólares de Hong Kong',
  };
  return names[currency] || currency;
}

