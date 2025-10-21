export interface FormatSignature {
  name: string;
  type: 'encrypted' | 'plaintext' | 'compressed' | 'unknown';
  confidence: number;
  details: string[];
  isEncrypted: boolean;
  encryption?: {
    algorithm?: string;
    keySize?: number;
    mode?: string;
    ivPresent?: boolean;
    saltPresent?: boolean;
  };
  structure?: {
    hasHeader?: boolean;
    headerSize?: number;
    blockSize?: number;
    totalBlocks?: number;
  };
}

export class FormatDetector {
  static detectFormat(data: Uint8Array): FormatSignature {
    const signatures: FormatSignature[] = [];

    console.log('[FormatDetector] Starting detection for', data.length, 'bytes');

    const plaintext = this.checkPlaintext(data);
    const aesGcm = this.checkAESGCM(data);
    const aesCbc = this.checkAESCBC(data);
    const compressed = this.checkCompressed(data);
    const custom = this.checkCustomDTC1B(data);

    signatures.push(plaintext);
    signatures.push(aesGcm);
    signatures.push(aesCbc);
    signatures.push(compressed);
    signatures.push(custom);

    console.log('[FormatDetector] All signatures:', signatures.map(s => ({
      name: s.name,
      confidence: s.confidence,
      type: s.type
    })));

    signatures.sort((a, b) => b.confidence - a.confidence);

    console.log('[FormatDetector] Selected format:', signatures[0].name, 'with confidence', signatures[0].confidence);

    return signatures[0];
  }

  private static checkAESGCM(data: Uint8Array): FormatSignature {
    const details: string[] = [];
    let confidence = 0;

    const first16 = data.slice(0, 16);
    const entropy = this.calculateEntropy(first16);

    if (entropy > 7.5) {
      details.push('High entropy in first 16 bytes (possible IV)');
      confidence += 30;
    }

    const hasGCMTag = data.length >= 16 && this.calculateEntropy(data.slice(data.length - 16)) > 7.0;
    if (hasGCMTag) {
      details.push('Last 16 bytes have high entropy (possible GCM tag)');
      confidence += 25;
    }

    if (data.length % 16 !== 0 && data.length % 16 <= 16) {
      details.push('Length suggests AES with possible padding');
      confidence += 15;
    }

    const overallEntropy = this.calculateEntropy(data.slice(0, Math.min(1024, data.length)));
    if (overallEntropy > 7.8) {
      details.push(`Very high overall entropy (${overallEntropy.toFixed(2)})`);
      confidence += 20;
    }

    return {
      name: 'AES-256-GCM Encrypted',
      type: 'encrypted',
      confidence,
      details,
      isEncrypted: true,
      encryption: {
        algorithm: 'AES',
        keySize: 256,
        mode: 'GCM',
        ivPresent: entropy > 7.5,
        saltPresent: false
      }
    };
  }

  private static checkAESCBC(data: Uint8Array): FormatSignature {
    const details: string[] = [];
    let confidence = 0;

    if (data.length % 16 === 0) {
      details.push('Length is multiple of 16 (AES block size)');
      confidence += 20;
    }

    const first16 = data.slice(0, 16);
    const entropy = this.calculateEntropy(first16);

    if (entropy > 7.5) {
      details.push('High entropy in first 16 bytes (possible IV)');
      confidence += 25;
    }

    const hasRepeatingBlocks = this.hasRepeatingBlocks(data, 16);
    if (!hasRepeatingBlocks) {
      details.push('No repeating 16-byte blocks detected');
      confidence += 15;
    }

    return {
      name: 'AES-256-CBC Encrypted',
      type: 'encrypted',
      confidence,
      details,
      isEncrypted: true,
      encryption: {
        algorithm: 'AES',
        keySize: 256,
        mode: 'CBC',
        ivPresent: entropy > 7.5
      }
    };
  }

  private static checkPlaintext(data: Uint8Array): FormatSignature {
    const details: string[] = [];
    let confidence = 0;

    const currencies = ['USD', 'EUR', 'GBP'];
    let currencyMatches = 0;

    console.log('[Plaintext Check] Searching for currency patterns...');

    for (const currency of currencies) {
      const matches = this.findPattern(data, new TextEncoder().encode(currency));
      console.log(`[Plaintext Check] ${currency}: ${matches.length} matches found`);
      if (matches.length > 0) {
        currencyMatches++;
        details.push(`Found ${matches.length} occurrence(s) of ${currency}`);
        confidence += 30;
      }
    }

    const entropy = this.calculateEntropy(data.slice(0, Math.min(1024, data.length)));
    console.log('[Plaintext Check] Entropy:', entropy.toFixed(2));

    if (entropy < 6.0) {
      details.push(`Low entropy (${entropy.toFixed(2)}) suggests plaintext`);
      confidence += 20;
    } else if (entropy < 7.0) {
      details.push(`Moderate entropy (${entropy.toFixed(2)})`);
      confidence += 10;
    }

    const asciiPercentage = this.calculateASCIIPercentage(data);
    console.log('[Plaintext Check] ASCII percentage:', asciiPercentage.toFixed(1));

    if (asciiPercentage > 50) {
      details.push(`${asciiPercentage.toFixed(1)}% ASCII characters`);
      confidence += 15;
    } else if (asciiPercentage > 20) {
      details.push(`${asciiPercentage.toFixed(1)}% ASCII characters`);
      confidence += 5;
    }

    console.log('[Plaintext Check] Total confidence:', confidence);

    return {
      name: 'Plaintext DTC1B',
      type: 'plaintext',
      confidence,
      details,
      isEncrypted: false
    };
  }

  private static checkCompressed(data: Uint8Array): FormatSignature {
    const details: string[] = [];
    let confidence = 0;

    if (data[0] === 0x1f && data[1] === 0x8b) {
      details.push('GZIP magic number detected');
      confidence = 95;
      return {
        name: 'GZIP Compressed',
        type: 'compressed',
        confidence,
        details,
        isEncrypted: false
      };
    }

    if (data[0] === 0x50 && data[1] === 0x4b) {
      details.push('ZIP magic number detected');
      confidence = 95;
      return {
        name: 'ZIP Compressed',
        type: 'compressed',
        confidence,
        details,
        isEncrypted: false
      };
    }

    const entropy = this.calculateEntropy(data.slice(0, Math.min(1024, data.length)));
    if (entropy > 7.0 && entropy < 7.8) {
      details.push(`Moderate-high entropy (${entropy.toFixed(2)}) suggests compression`);
      confidence += 30;
    }

    return {
      name: 'Possibly Compressed',
      type: 'compressed',
      confidence,
      details,
      isEncrypted: false
    };
  }

  private static checkCustomDTC1B(data: Uint8Array): FormatSignature {
    const details: string[] = [];
    let confidence = 0;

    const magicBytes = data.slice(0, 8);
    const magicHex = Array.from(magicBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    details.push(`Magic bytes: ${magicHex.toUpperCase()}`);

    if (data[0] === 0x44 && data[1] === 0x54 && data[2] === 0x43) {
      details.push('Starts with "DTC" header');
      confidence += 40;
    }

    const possibleBlockSize = this.detectBlockSize(data);
    if (possibleBlockSize > 0) {
      details.push(`Detected possible block size: ${possibleBlockSize} bytes`);
      confidence += 20;

      return {
        name: 'Custom DTC1B Format',
        type: 'plaintext',
        confidence,
        details,
        isEncrypted: false,
        structure: {
          hasHeader: true,
          headerSize: 8,
          blockSize: possibleBlockSize,
          totalBlocks: Math.floor((data.length - 8) / possibleBlockSize)
        }
      };
    }

    return {
      name: 'Unknown Binary Format',
      type: 'unknown',
      confidence: 0,
      details: ['No recognizable format detected'],
      isEncrypted: false
    };
  }

  private static calculateEntropy(data: Uint8Array): number {
    const frequencies = new Array(256).fill(0);
    for (const byte of data) {
      frequencies[byte]++;
    }

    let entropy = 0;
    const len = data.length;
    for (const freq of frequencies) {
      if (freq > 0) {
        const p = freq / len;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  private static findPattern(data: Uint8Array, pattern: Uint8Array): number[] {
    const matches: number[] = [];

    for (let i = 0; i <= data.length - pattern.length; i++) {
      let match = true;
      for (let j = 0; j < pattern.length; j++) {
        if (data[i + j] !== pattern[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        matches.push(i);
      }
    }

    return matches;
  }

  private static hasRepeatingBlocks(data: Uint8Array, blockSize: number): boolean {
    const blocks = new Set<string>();

    for (let i = 0; i < data.length - blockSize; i += blockSize) {
      const block = Array.from(data.slice(i, i + blockSize))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (blocks.has(block)) {
        return true;
      }
      blocks.add(block);
    }

    return false;
  }

  private static calculateASCIIPercentage(data: Uint8Array): number {
    let asciiCount = 0;
    const sample = data.slice(0, Math.min(1000, data.length));

    for (const byte of sample) {
      if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
        asciiCount++;
      }
    }

    return (asciiCount / sample.length) * 100;
  }

  private static detectBlockSize(data: Uint8Array): number {
    const testSizes = [64, 128, 256, 512, 1024, 2048];

    for (const size of testSizes) {
      if (data.length >= size * 3) {
        const repeatingPattern = this.checkRepeatingStructure(data, size);
        if (repeatingPattern) {
          return size;
        }
      }
    }

    return 0;
  }

  private static checkRepeatingStructure(data: Uint8Array, blockSize: number): boolean {
    let similarityScore = 0;
    const numBlocks = Math.min(5, Math.floor(data.length / blockSize));

    for (let i = 0; i < numBlocks - 1; i++) {
      const block1 = data.slice(i * blockSize, (i + 1) * blockSize);
      const block2 = data.slice((i + 1) * blockSize, (i + 2) * blockSize);

      const similarity = this.calculateSimilarity(block1, block2);
      if (similarity > 0.3) {
        similarityScore++;
      }
    }

    return similarityScore >= 2;
  }

  private static calculateSimilarity(block1: Uint8Array, block2: Uint8Array): number {
    let similar = 0;
    const len = Math.min(block1.length, block2.length);

    for (let i = 0; i < len; i++) {
      if (block1[i] === block2[i]) {
        similar++;
      }
    }

    return similar / len;
  }

  static extractRawData(data: Uint8Array, format: FormatSignature): {
    header?: Uint8Array;
    body: Uint8Array;
    footer?: Uint8Array;
    iv?: Uint8Array;
    tag?: Uint8Array;
    blocks?: Uint8Array[];
  } {
    try {
      console.log('[FormatDetector] Extracting raw data for format:', format.name);

      const result: any = {};

      if (format.type === 'encrypted') {
        if (format.encryption?.mode === 'GCM') {
          if (data.length < 32) {
            console.warn('[FormatDetector] File too small for GCM (needs at least 32 bytes)');
            result.body = data;
          } else {
            result.iv = data.slice(0, 16);
            result.tag = data.slice(data.length - 16);
            result.body = data.slice(16, data.length - 16);
            console.log('[FormatDetector] Extracted GCM: IV=16 bytes, Body=' + result.body.length + ' bytes, Tag=16 bytes');
          }
        } else if (format.encryption?.mode === 'CBC') {
          if (data.length < 16) {
            console.warn('[FormatDetector] File too small for CBC (needs at least 16 bytes)');
            result.body = data;
          } else {
            result.iv = data.slice(0, 16);
            result.body = data.slice(16);
            console.log('[FormatDetector] Extracted CBC: IV=16 bytes, Body=' + result.body.length + ' bytes');
          }
        } else {
          result.body = data;
        }
      } else if (format.structure?.hasHeader) {
        const headerSize = format.structure.headerSize || 0;
        result.header = data.slice(0, headerSize);
        result.body = data.slice(headerSize);
        console.log('[FormatDetector] Extracted with header: Header=' + headerSize + ' bytes, Body=' + result.body.length + ' bytes');

        if (format.structure.blockSize && result.body.length > 0) {
          result.blocks = [];
          const blockSize = format.structure.blockSize;
          for (let i = 0; i < result.body.length; i += blockSize) {
            result.blocks.push(result.body.slice(i, i + blockSize));
          }
          console.log('[FormatDetector] Split into ' + result.blocks.length + ' blocks of ' + blockSize + ' bytes');
        }
      } else {
        result.body = data;
        console.log('[FormatDetector] Using entire file as body: ' + result.body.length + ' bytes');
      }

      if (!result.body) {
        console.error('[FormatDetector] No body extracted! Falling back to full data');
        result.body = data;
      }

      return result;
    } catch (error) {
      console.error('[FormatDetector] Error extracting data:', error);
      return { body: data };
    }
  }
}
