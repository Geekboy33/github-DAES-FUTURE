interface WorkerMessage {
  type: 'INITIALIZE' | 'PROCESS_CHUNK';
  data: any;
}

interface WorkerResponse {
  type: 'INITIALIZED' | 'CHUNK_PROCESSED' | 'ERROR';
  data: any;
}

interface CurrencyBalance {
  currency: string;
  totalAmount: number;
  transactionCount: number;
  amounts: number[];
  largestTransaction: number;
  smallestTransaction: number;
}

let currencyPatterns: Map<string, Uint8Array> = new Map();

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, data } = e.data;

  try {
    if (type === 'INITIALIZE') {
      initializePatterns(data.patterns);
      self.postMessage({
        type: 'INITIALIZED',
        data: { success: true }
      } as WorkerResponse);
    } else if (type === 'PROCESS_CHUNK') {
      const { chunk, offset } = data;
      const balances = processChunk(new Uint8Array(chunk), offset);

      self.postMessage({
        type: 'CHUNK_PROCESSED',
        data: { balances, bytesProcessed: chunk.byteLength }
      } as WorkerResponse);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    } as WorkerResponse);
  }
};

function initializePatterns(patterns: [string, number[]][]): void {
  currencyPatterns.clear();

  for (const [currency, pattern] of patterns) {
    currencyPatterns.set(currency, new Uint8Array(pattern));
  }

  console.log('[Worker] Initialized with', currencyPatterns.size, 'currency patterns');
}

function processChunk(data: Uint8Array, offset: number): { [currency: string]: CurrencyBalance } {
  const balances: { [currency: string]: CurrencyBalance } = {};
  const dataLength = data.length;

  for (let i = 0; i < dataLength - 11; i++) {
    for (const [currency, pattern] of currencyPatterns) {
      if (matchesPattern(data, i, pattern)) {
        const amount = extractAmount(data, i + pattern.length);

        if (amount > 0 && isValidAmount(amount)) {
          addToBalance(balances, currency, amount);
          i += pattern.length + 8;
          break;
        }
      }
    }
  }

  return balances;
}

function matchesPattern(data: Uint8Array, offset: number, pattern: Uint8Array): boolean {
  if (offset + pattern.length > data.length) return false;

  for (let i = 0; i < pattern.length; i++) {
    if (data[offset + i] !== pattern[i]) return false;
  }

  return true;
}

function extractAmount(data: Uint8Array, offset: number): number {
  try {
    if (offset + 4 <= data.length) {
      const view = new DataView(data.buffer, data.byteOffset + offset, 4);
      const potentialAmount = view.getUint32(0, true);

      if (potentialAmount > 0 && potentialAmount < 100000000000) {
        return potentialAmount / 100;
      }
    }

    if (offset + 8 <= data.length) {
      const view = new DataView(data.buffer, data.byteOffset + offset, 8);
      const potentialDouble = view.getFloat64(0, true);

      if (potentialDouble > 0 && potentialDouble < 1000000000 && !isNaN(potentialDouble)) {
        return potentialDouble;
      }
    }
  } catch (error) {
  }

  return 0;
}

function isValidAmount(amount: number): boolean {
  if (amount === 0) return false;
  if (amount < 0.01) return false;
  if (amount > 10000000) return false;

  const decimalPart = amount - Math.floor(amount);
  const decimals = decimalPart.toFixed(10).split('.')[1]?.replace(/0+$/, '').length || 0;

  if (decimals > 2) {
    return false;
  }

  return true;
}

function addToBalance(
  balances: { [currency: string]: CurrencyBalance },
  currency: string,
  amount: number
): void {
  if (!balances[currency]) {
    balances[currency] = {
      currency,
      totalAmount: 0,
      transactionCount: 0,
      amounts: [],
      largestTransaction: 0,
      smallestTransaction: Infinity,
    };
  }

  const balance = balances[currency];
  balance.totalAmount += amount;
  balance.transactionCount++;

  if (balance.amounts.length >= 1000) {
    balance.amounts.shift();
  }
  balance.amounts.push(amount);

  balance.largestTransaction = Math.max(balance.largestTransaction, amount);
  balance.smallestTransaction = Math.min(balance.smallestTransaction, amount);
}

export {};
