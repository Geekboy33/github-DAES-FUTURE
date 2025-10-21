export interface CurrencyMatch {
  offset: number;
  currency: string;
  amount: bigint | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface ParsedBlock {
  id: string;
  offsetStart: number;
  offsetEnd: number;
  currency: string;
  amountMinorUnits: bigint;
  rawData: Uint8Array;
  metadata: Record<string, unknown>;
}

export class DTC1BParser {
  private static readonly ISO_CURRENCIES = ['USD', 'EUR', 'GBP'];
  private static readonly ISO_NUMERIC_CODES: Record<string, number> = {
    'USD': 840,
    'EUR': 978,
    'GBP': 826
  };

  static findCurrencyMatches(data: Uint8Array): CurrencyMatch[] {
    const matches: CurrencyMatch[] = [];

    for (const currency of this.ISO_CURRENCIES) {
      const currencyBytes = new TextEncoder().encode(currency);

      for (let i = 0; i <= data.length - currencyBytes.length; i++) {
        let match = true;
        for (let j = 0; j < currencyBytes.length; j++) {
          if (data[i + j] !== currencyBytes[j]) {
            match = false;
            break;
          }
        }

        if (match) {
          const amount = this.extractAmount(data, i + currencyBytes.length);
          matches.push({
            offset: i,
            currency,
            amount: amount.value,
            confidence: amount.confidence
          });
        }
      }
    }

    const numericMatches = this.findNumericCurrencyCodes(data);
    matches.push(...numericMatches);

    return matches.sort((a, b) => a.offset - b.offset);
  }

  private static findNumericCurrencyCodes(data: Uint8Array): CurrencyMatch[] {
    const matches: CurrencyMatch[] = [];

    for (const [currency, code] of Object.entries(this.ISO_NUMERIC_CODES)) {
      const view = new DataView(data.buffer);

      for (let i = 0; i <= data.length - 2; i++) {
        try {
          const value16 = view.getUint16(i, false);
          if (value16 === code) {
            const amount = this.extractAmount(data, i + 2);
            matches.push({
              offset: i,
              currency,
              amount: amount.value,
              confidence: 'medium'
            });
          }
        } catch (e) {
          continue;
        }
      }
    }

    return matches;
  }

  private static extractAmount(
    data: Uint8Array,
    offset: number
  ): { value: bigint | null; confidence: 'high' | 'medium' | 'low' } {
    if (offset + 8 > data.length) {
      return { value: null, confidence: 'low' };
    }

    const view = new DataView(data.buffer);

    try {
      const int64BE = view.getBigUint64(offset, false);
      if (int64BE > 0n && int64BE < 100000000000000n) {
        return { value: int64BE, confidence: 'high' };
      }
    } catch (e) {
      // Continue to next attempt
    }

    try {
      const int64LE = view.getBigUint64(offset, true);
      if (int64LE > 0n && int64LE < 100000000000000n) {
        return { value: int64LE, confidence: 'medium' };
      }
    } catch (e) {
      // Continue to next attempt
    }

    try {
      const float64 = view.getFloat64(offset, false);
      if (float64 > 0 && float64 < 1000000000) {
        return { value: BigInt(Math.round(float64 * 100)), confidence: 'low' };
      }
    } catch (e) {
      // Continue to next attempt
    }

    return { value: null, confidence: 'low' };
  }

  static parseBlocks(data: Uint8Array, fileId: string): ParsedBlock[] {
    const matches = this.findCurrencyMatches(data);
    const blocks: ParsedBlock[] = [];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];

      if (!match.amount) continue;

      const nextOffset = i < matches.length - 1
        ? matches[i + 1].offset
        : data.length;

      const blockSize = Math.min(nextOffset - match.offset, 256);

      blocks.push({
        id: `${fileId}-block-${i}`,
        offsetStart: match.offset,
        offsetEnd: match.offset + blockSize,
        currency: match.currency,
        amountMinorUnits: match.amount,
        rawData: data.slice(match.offset, match.offset + blockSize),
        metadata: {
          confidence: match.confidence,
          blockIndex: i,
          detectionMethod: match.offset < 100 ? 'ascii' : 'heuristic'
        }
      });
    }

    return blocks;
  }

  static formatAmount(amountMinorUnits: bigint, currency: string): string {
    const major = amountMinorUnits / 100n;
    const minor = amountMinorUnits % 100n;

    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };

    return `${symbols[currency] || currency} ${major}.${minor.toString().padStart(2, '0')}`;
  }

  static createSampleDTC1BFile(): Uint8Array {
    const buffer = new Uint8Array(512);
    const view = new DataView(buffer.buffer);

    let offset = 0;

    const encoder = new TextEncoder();
    buffer.set(encoder.encode('USD'), offset);
    offset += 3;
    view.setBigUint64(offset, 125000n, false);
    offset += 8;

    offset = 128;
    buffer.set(encoder.encode('EUR'), offset);
    offset += 3;
    view.setBigUint64(offset, 250000n, false);
    offset += 8;

    offset = 256;
    buffer.set(encoder.encode('GBP'), offset);
    offset += 3;
    view.setBigUint64(offset, 175000n, false);
    offset += 8;

    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === 0) {
        buffer[i] = Math.floor(Math.random() * 256);
      }
    }

    return buffer;
  }
}
