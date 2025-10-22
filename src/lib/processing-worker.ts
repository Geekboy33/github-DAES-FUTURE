import { CurrencyBalance } from './balances-store';

export interface WorkerMessage {
  type: 'start' | 'pause' | 'resume' | 'stop' | 'progress';
  payload?: any;
}

export interface WorkerResponse {
  type: 'progress' | 'complete' | 'error';
  progress?: number;
  balances?: CurrencyBalance[];
  error?: string;
}

class ProcessingWorker {
  private isProcessing = false;
  private isPaused = false;
  private shouldStop = false;

  async processFile(
    fileData: ArrayBuffer,
    fileName: string,
    resumeFrom: number = 0,
    onProgress: (progress: number, balances: CurrencyBalance[]) => void
  ): Promise<void> {
    this.isProcessing = true;
    this.shouldStop = false;

    const CHUNK_SIZE = 10 * 1024 * 1024;
    const totalSize = fileData.byteLength;
    let offset = resumeFrom;
    const balanceTracker: { [currency: string]: CurrencyBalance } = {};

    try {
      while (offset < totalSize && !this.shouldStop) {
        while (this.isPaused && !this.shouldStop) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (this.shouldStop) break;

        const chunkEnd = Math.min(offset + CHUNK_SIZE, totalSize);
        const chunk = new Uint8Array(fileData, offset, chunkEnd - offset);

        this.extractCurrencyBalances(chunk, offset, balanceTracker);

        offset = chunkEnd;
        const progress = (offset / totalSize) * 100;
        const balancesArray = Object.values(balanceTracker).sort((a, b) => {
          if (a.currency === 'USD') return -1;
          if (b.currency === 'USD') return 1;
          if (a.currency === 'EUR') return -1;
          if (b.currency === 'EUR') return 1;
          return b.totalAmount - a.totalAmount;
        });

        onProgress(progress, balancesArray);

        await new Promise(resolve => setTimeout(resolve, 10));
      }

      if (!this.shouldStop) {
        const balancesArray = Object.values(balanceTracker);
        onProgress(100, balancesArray);
      }
    } catch (error) {
      console.error('[ProcessingWorker] Error:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  stop(): void {
    this.shouldStop = true;
    this.isProcessing = false;
  }

  private extractCurrencyBalances(
    data: Uint8Array,
    offset: number,
    currentBalances: { [currency: string]: CurrencyBalance }
  ): void {
    const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'MXN', 'BRL', 'RUB', 'KRW', 'SGD', 'HKD'];

    currencies.forEach(currency => {
      const currencyBytes = new TextEncoder().encode(currency);

      for (let i = 0; i <= data.length - currencyBytes.length - 8; i++) {
        let match = true;
        for (let j = 0; j < currencyBytes.length; j++) {
          if (data[i + j] !== currencyBytes[j]) {
            match = false;
            break;
          }
        }

        if (match) {
          let amount = 0;

          try {
            if (i + currencyBytes.length + 4 <= data.length) {
              const view = new DataView(data.buffer, data.byteOffset + i + currencyBytes.length, 4);
              const potentialAmount = view.getUint32(0, true);

              if (potentialAmount > 0 && potentialAmount < 100000000000) {
                amount = potentialAmount / 100;
              }
            }

            if (amount === 0 && i + currencyBytes.length + 8 <= data.length) {
              const view = new DataView(data.buffer, data.byteOffset + i + currencyBytes.length, 8);
              const potentialDouble = view.getFloat64(0, true);

              if (potentialDouble > 0 && potentialDouble < 1000000000 && !isNaN(potentialDouble)) {
                amount = potentialDouble;
              }
            }

            if (amount > 0) {
              if (!currentBalances[currency]) {
                currentBalances[currency] = {
                  currency,
                  totalAmount: 0,
                  transactionCount: 0,
                  averageTransaction: 0,
                  lastUpdated: new Date().toISOString(),
                  accountName: `Cuenta en ${currency}`,
                  amounts: [],
                  largestTransaction: 0,
                  smallestTransaction: Infinity,
                };
              }

              const balance = currentBalances[currency];
              balance.totalAmount += amount;
              balance.transactionCount++;
              balance.amounts.push(amount);
              balance.averageTransaction = balance.totalAmount / balance.transactionCount;
              balance.largestTransaction = Math.max(balance.largestTransaction, amount);
              balance.smallestTransaction = Math.min(balance.smallestTransaction, amount);
              balance.lastUpdated = new Date().toISOString();
            }
          } catch (error) {
          }
        }
      }
    });
  }
}

export const processingWorker = new ProcessingWorker();
