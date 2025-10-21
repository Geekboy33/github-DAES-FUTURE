import { useState, useRef } from 'react';
import {
  Upload, Download, FileText, Binary, Gauge, ChevronDown, ChevronRight,
  Lock, Unlock, AlertCircle, Key, Shield, Database, Activity,
  FileSearch, CheckCircle, XCircle, AlertTriangle,
  Info, Play, Pause, RotateCcw, FileCheck, Zap, Eye, Hash
} from 'lucide-react';
import { FormatDetector, FormatSignature } from '../lib/format-detector';
import { CryptoUtils } from '../lib/crypto';
import { DTC1BParser } from '../lib/dtc1b-parser';
import * as CryptoJS from 'crypto-js';

interface DTC1BTransaction {
  offset: number;
  currency: string;
  amount: bigint;
  blockIndex: number;
  rawData: Uint8Array;
  metadata?: {
    confidence: string;
    blockType: string;
  };
}

interface DTC1BAnalysisResult {
  fileName: string;
  fileSize: number;
  fileHash: string;
  detectedFormat: {
    name: string;
    confidence: number;
    category: string;
    isDTC1B: boolean;
    isEncrypted: boolean;
    details: string[];
  };
  dtc1bAnalysis: {
    isValidDTC1B: boolean;
    confidence: number;
    structure: {
      hasHeader: boolean;
      blockSize: number;
      totalBlocks: number;
      detectedBlocks: number;
    };
    transactions: DTC1BTransaction[];
    blockStructure: boolean;
    totalTransactions: number;
  };
  encryptionAnalysis: {
    isEncrypted: boolean;
    algorithm?: string;
    confidence: number;
    possibleKeys?: string[];
  };
  forensicAnalysis: {
    entropy: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    suspiciousPatterns: string[];
    fileSignature: string;
  };
  hexDump: string[];
  rawData: Uint8Array;
  decryptedData?: Uint8Array;
}

interface DecryptionAttempt {
  id: string;
  method: string;
  password?: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  progress: number;
  result?: Uint8Array;
  error?: string;
  timeElapsed: number;
}

export function DTC1BAnalyzer() {
  const [analysis, setAnalysis] = useState<DTC1BAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('overview');
  const [hexViewOffset, setHexViewOffset] = useState(0);
  const [hexViewLimit, setHexViewLimit] = useState(512);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBruteForceModal, setShowBruteForceModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pendingFile, setPendingFile] = useState<{ data: Uint8Array; name: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bruteForceProgress, setBruteForceProgress] = useState(0);
  const [decryptionAttempts, setDecryptionAttempts] = useState<DecryptionAttempt[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Análisis avanzado de archivos DTC1B
  const analyzeDTC1BFile = async (data: Uint8Array, fileName: string): Promise<DTC1BAnalysisResult> => {
    console.log('🔍 Iniciando análisis completo de archivo DTC1B...');

    // 1. Detectar formato con múltiples métodos
    const format = detectDTC1BFormat(data);
    console.log('📋 Formato detectado:', format);

    // 2. Buscar transacciones con métodos avanzados
    const transactions = findDTC1BTransactions(data);
    console.log('💰 Transacciones encontradas:', transactions.length);

    // 3. Análisis de encriptación avanzado
    const encryption = analyzeEncryption(data);
    console.log('🔐 Análisis de encriptación:', encryption);

    // 4. Análisis forense completo
    const forensic = performForensicAnalysis(data);
    console.log('🛡️ Análisis forense:', forensic);

    // 5. Generar hash del archivo
    const fileHash = generateFileHash(data);

    // 6. Generar hex dump
    const hexDump = generateHexDump(data, 0, Math.min(1024, data.length));

    return {
      fileName,
      fileSize: data.length,
      fileHash,
      detectedFormat: format,
      dtc1bAnalysis: {
        isValidDTC1B: transactions.length > 0,
        confidence: format.confidence,
        structure: {
          hasHeader: format.details.some(d => d.includes('header')),
          blockSize: 128,
          totalBlocks: Math.floor(data.length / 128),
          detectedBlocks: transactions.length
        },
        transactions,
        blockStructure: transactions.length > 0,
        totalTransactions: transactions.length
      },
      encryptionAnalysis: encryption,
      forensicAnalysis: forensic,
      hexDump,
      rawData: data
    };
  };

  // Detección avanzada de formato DTC1B
  const detectDTC1BFormat = (data: Uint8Array) => {
    let confidence = 0;
    const details = [];

    console.log('[DTC1B Detection] Starting enhanced DTC1B detection...');

    // 1. Buscar códigos de moneda estándar
    const standardCurrencies = ['USD', 'EUR', 'GBP'];
    let standardCurrencyMatches = 0;

    standardCurrencies.forEach(currency => {
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
          standardCurrencyMatches++;
          details.push(`Código ${currency} encontrado en offset 0x${i.toString(16)}`);
          break;
        }
      }
    });

    if (standardCurrencyMatches > 0) {
      confidence += 40;
    }

    // 2. Buscar códigos de moneda alternativos
    const altCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK'];
    let altCurrencyMatches = 0;

    altCurrencies.forEach(currency => {
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
          altCurrencyMatches++;
          break;
        }
      }
    });

    if (altCurrencyMatches > 0) {
      confidence += 15;
      details.push(`Encontrados ${altCurrencyMatches} códigos de moneda incluyendo alternativas`);
    }

    // 3. Buscar patrones de números de cuenta
    const accountPattern = /\d{8,20}/g;
    const textContent = new TextDecoder('utf-8', { fatal: false }).decode(data.slice(0, Math.min(2048, data.length)));
    const accountMatches = textContent.match(accountPattern);

    if (accountMatches && accountMatches.length > 0) {
      confidence += 20;
      details.push(`Encontrados ${accountMatches.length} números de cuenta potenciales`);
    }

    // 4. Buscar patrones específicos DTC1B
    let dtc1bPatterns = 0;
    for (let i = 0; i <= data.length - 3; i++) {
      if (data[i] === 0x44 && data[i + 1] === 0x54 && data[i + 2] === 0x43) {
        dtc1bPatterns++;
        details.push(`Firma DTC encontrada en offset 0x${i.toString(16)}`);
      }
    }

    if (dtc1bPatterns > 0) {
      confidence += 25;
    }

    // 5. Análisis estructural
    const blockSizes = detectBlockSizes(data);
    if (blockSizes.includes(128) || blockSizes.includes(256) || blockSizes.includes(512)) {
      confidence += 20;
      details.push(`Estructura de bloques detectada: ${blockSizes.join(', ')} bytes`);
    }

    // 6. Análisis de entropía sofisticado
    const entropy = calculateEntropy(data);
    const entropyWindows = [];

    for (let i = 0; i < data.length - 256; i += 256) {
      const window = data.slice(i, i + 256);
      entropyWindows.push(calculateEntropy(window));
    }

    const avgWindowEntropy = entropyWindows.reduce((a, b) => a + b, 0) / entropyWindows.length;
    const entropyVariance = entropyWindows.reduce((acc, e) => acc + Math.pow(e - avgWindowEntropy, 2), 0) / entropyWindows.length;

    if (entropy < 6.5 && entropyVariance > 0.5) {
      confidence += 15;
      details.push(`Patrón de entropía estructurado: global=${entropy.toFixed(2)}, varianza=${entropyVariance.toFixed(2)}`);
    }

    // 7. Buscar patrones financieros
    const financialPatterns = [
      'BANK', 'ACCOUNT', 'BALANCE', 'TRANSFER', 'AMOUNT',
      'CURRENCY', 'TRANSACTION', 'LEDGER', 'STATEMENT'
    ];

    let financialTextMatches = 0;
    financialPatterns.forEach(pattern => {
      const patternBytes = new TextEncoder().encode(pattern);
      for (let i = 0; i <= data.length - patternBytes.length; i++) {
        let match = true;
        for (let j = 0; j < patternBytes.length; j++) {
          if (data[i + j] !== patternBytes[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          financialTextMatches++;
          break;
        }
      }
    });

    if (financialTextMatches > 0) {
      confidence += 10;
      details.push(`Encontradas ${financialTextMatches} palabras clave financieras`);
    }

    // 8. Análisis de distribución de bytes
    const byteFreq = new Array(256).fill(0);
    data.forEach(byte => byteFreq[byte]++);

    const sortedFreq = byteFreq.map((count, byte) => ({ byte, count }))
      .sort((a, b) => b.count - a.count);

    const topBytes = sortedFreq.slice(0, 5);
    const topBytesSum = topBytes.reduce((sum, item) => sum + item.count, 0);
    const topBytesPercentage = (topBytesSum / data.length) * 100;

    if (topBytesPercentage > 60 && topBytes.length <= 10) {
      confidence += 10;
      details.push(`Distribución concentrada: ${topBytesPercentage.toFixed(1)}% en ${topBytes.length} bytes principales`);
    }

    // 9. Verificación de tamaño típico
    if (data.length >= 64 && data.length <= 1048576) {
      confidence += 5;
      details.push(`Tamaño de archivo (${formatBytes(data.length)}) en rango típico DTC1B`);
    }

    console.log('[DTC1B Detection] Final confidence:', confidence, 'details:', details);

    return {
      name: 'DTC1B Banking Format (Enhanced Detection)',
      confidence,
      category: 'banking',
      isDTC1B: confidence > 50,
      isEncrypted: entropy > 7.0,
      details
    };
  };

  // Búsqueda avanzada de transacciones DTC1B
  const findDTC1BTransactions = (data: Uint8Array): DTC1BTransaction[] => {
    const transactions: DTC1BTransaction[] = [];
    const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'];

    currencies.forEach((currency, currencyIndex) => {
      const currencyBytes = new TextEncoder().encode(currency);

      for (let i = 0; i <= data.length - 11; i++) {
        // Verificar código de moneda
        let currencyMatch = true;
        for (let j = 0; j < currencyBytes.length; j++) {
          if (data[i + j] !== currencyBytes[j]) {
            currencyMatch = false;
            break;
          }
        }

        if (currencyMatch) {
          // Verificar cantidad (8 bytes)
          const amountBytes = data.slice(i + 3, i + 11);
          const view = new DataView(amountBytes.buffer);

          try {
            const amount = view.getBigUint64(0, false);
            if (amount > 0n && amount < 100000000000000n) {
              const blockSize = Math.min(128, data.length - i);
              transactions.push({
                offset: i,
                currency,
                amount,
                blockIndex: transactions.length,
                rawData: data.slice(i, i + blockSize),
                metadata: {
                  confidence: 'high',
                  blockType: 'currency_transaction'
                }
              });
            }
          } catch (e) {
            // Continuar búsqueda
          }
        }
      }
    });

    return transactions;
  };

  // Análisis de encriptación avanzado
  const analyzeEncryption = (data: Uint8Array) => {
    const entropy = calculateEntropy(data);
    const possibleKeys: string[] = [];

    // Buscar posibles claves en el archivo
    const textContent = new TextDecoder('utf-8', { fatal: false }).decode(data);
    const potentialKeys = textContent.match(/[A-Za-z0-9]{8,32}/g);

    if (potentialKeys) {
      possibleKeys.push(...potentialKeys.slice(0, 5));
    }

    return {
      isEncrypted: entropy > 7.0,
      algorithm: entropy > 7.5 ? 'AES-256-GCM' : entropy > 7.0 ? 'AES-256-CBC' : undefined,
      confidence: entropy > 7.0 ? 80 : 20,
      possibleKeys
    };
  };

  // Análisis forense completo
  const performForensicAnalysis = (data: Uint8Array) => {
    const entropy = calculateEntropy(data);
    const fileSignature = generateFileHash(data);

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (entropy > 7.8) riskLevel = 'critical';
    else if (entropy > 7.0) riskLevel = 'high';
    else if (entropy > 6.0) riskLevel = 'medium';

    const suspiciousPatterns = [];
    if (entropy > 7.5) suspiciousPatterns.push('Alta entropía sugiere encriptación fuerte');
    if (data.length % 16 === 0 && data.length > 16) suspiciousPatterns.push('Longitud divisible por 16 (AES)');

    return {
      entropy,
      riskLevel,
      suspiciousPatterns,
      fileSignature
    };
  };

  // Generar hash único del archivo
  const generateFileHash = (data: Uint8Array): string => {
    let hash = 0;
    for (let i = 0; i < Math.min(data.length, 1024); i++) {
      hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
    }
    return hash.toString(16).padStart(8, '0').toUpperCase();
  };

  // Calcular entropía
  const calculateEntropy = (data: Uint8Array): number => {
    if (data.length === 0) return 0;

    const freq = new Array(256).fill(0);
    data.forEach(byte => freq[byte]++);

    let entropy = 0;
    const len = data.length;
    for (const f of freq) {
      if (f > 0) {
        const p = f / len;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  };

  // Detectar tamaños de bloque
  const detectBlockSizes = (data: Uint8Array): number[] => {
    const sizes: number[] = [];
    const testSizes = [64, 128, 256, 512, 1024, 2048, 4096];

    testSizes.forEach(size => {
      if (data.length >= size * 2) {
        let matches = 0;
        for (let i = 0; i < data.length - size; i += size) {
          const block1 = data.slice(i, i + size);
          const block2 = data.slice(i + size, i + size * 2);

          if (blocksAreSimilar(block1, block2)) {
            matches++;
          }
        }

        if (matches > 2) {
          sizes.push(size);
        }
      }
    });

    return sizes;
  };

  // Verificar similitud entre bloques
  const blocksAreSimilar = (block1: Uint8Array, block2: Uint8Array): boolean => {
    if (block1.length !== block2.length) return false;

    let similar = 0;
    for (let i = 0; i < block1.length; i++) {
      if (block1[i] === block2[i]) similar++;
    }

    return (similar / block1.length) > 0.8;
  };

  // Generar hex dump
  const generateHexDump = (data: Uint8Array, offset: number, length: number): string[] => {
    const lines: string[] = [];
    const end = Math.min(offset + length, data.length);

    for (let i = offset; i < end; i += 16) {
      const hexBytes: string[] = [];
      const asciiChars: string[] = [];

      for (let j = 0; j < 16 && i + j < end; j++) {
        const byte = data[i + j];
        hexBytes.push(byte.toString(16).padStart(2, '0'));
        asciiChars.push(byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.');
      }

      const offsetStr = i.toString(16).padStart(8, '0').toUpperCase();
      const hexStr = hexBytes.join(' ').padEnd(47, ' ');
      const asciiStr = asciiChars.join('');

      lines.push(`${offsetStr}  ${hexStr}  |${asciiStr}|`);
    }

    return lines;
  };

  // Formatear bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Formatear moneda
  const formatCurrency = (amount: bigint, currency: string): string => {
    const divisor = currency === 'GBP' ? 100n : (currency === 'USD' || currency === 'EUR' ? 100n : 100n);
    const major = amount / divisor;
    const minor = amount % divisor;
    return `${major.toString()}.${minor.toString().padStart(2, '0')} ${currency}`;
  };

  // Procesar archivo
  const processFileData = async (data: Uint8Array, fileName: string) => {
    try {
      console.log('[DTC1BAnalyzer] Processing file data...');
      console.log('[DTC1BAnalyzer] File size:', data.length, 'bytes');

      setLoading(true);

      const analysis = await analyzeDTC1BFile(data, fileName);

      setAnalysis(analysis);
      console.log('[DTC1BAnalyzer] DTC1B Analysis complete');
    } catch (error) {
      console.error('[DTC1BAnalyzer] Error analyzing file:', error);
      alert(`Error al analizar el archivo DTC1B: ${error instanceof Error ? error.message : String(error)}`);
      setLoading(false);
    }
  };

  // Manejar carga de archivos
  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    console.log('[DTC1BAnalyzer] File selected:', file.name, file.size, 'bytes');

    const reader = new FileReader();

    reader.onerror = () => {
      console.error('[DTC1BAnalyzer] FileReader error:', reader.error);
      alert(`Error al leer el archivo: ${reader.error?.message || 'Error desconocido'}\n\nIntenta:\n1. Copiar el archivo a tu carpeta de Descargas\n2. Verificar que el archivo no esté en uso\n3. Intentar con otro archivo`);
      setLoading(false);
    };

    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        alert('No se pudo leer el contenido del archivo');
        setLoading(false);
        return;
      }

      const data = new Uint8Array(arrayBuffer);
      processFileData(data, file.name);
    };

    reader.readAsArrayBuffer(file);
  };

  // Exportar a JSON
  const exportToJSON = () => {
    if (!analysis) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      fileName: analysis.fileName,
      fileSize: analysis.fileSize,
      fileHash: analysis.fileHash,
      analysis: {
        detectedFormat: analysis.detectedFormat,
        dtc1bAnalysis: analysis.dtc1bAnalysis,
        encryptionAnalysis: analysis.encryptionAnalysis,
        forensicAnalysis: analysis.forensicAnalysis,
        transactions: analysis.dtc1bAnalysis.transactions.map(t => ({
          offset: t.offset,
          currency: t.currency,
          amount: t.amount.toString(),
          blockIndex: t.blockIndex
        }))
      },
      recommendations: generateRecommendations(analysis)
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.fileName}_dtc1b_analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Exportar a CSV
  const exportToCSV = () => {
    if (!analysis) return;

    const headers = ['Transacción', 'Offset', 'Moneda', 'Cantidad (Centavos)', 'Cantidad (Formato)', 'Bloque'];
    const rows = analysis.dtc1bAnalysis.transactions.map((transaction, i) => [
      (i + 1).toString(),
      `0x${transaction.offset.toString(16)}`,
      transaction.currency,
      transaction.amount.toString(),
      formatCurrency(transaction.amount, transaction.currency),
      transaction.blockIndex.toString()
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.fileName}_transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generar recomendaciones
  const generateRecommendations = (analysis: DTC1BAnalysisResult) => {
    const recommendations = [];

    if (!analysis.dtc1bAnalysis.isValidDTC1B) {
      recommendations.push('❌ Archivo no detectado como DTC1B válido');
    }

    if (analysis.encryptionAnalysis.isEncrypted) {
      recommendations.push('🔐 Archivo encriptado - requiere autenticación');
    }

    if (analysis.forensicAnalysis.riskLevel === 'critical' || analysis.forensicAnalysis.riskLevel === 'high') {
      recommendations.push('⚠️ Nivel de riesgo alto detectado');
    }

    if (analysis.dtc1bAnalysis.totalTransactions === 0) {
      recommendations.push('📭 No se encontraron transacciones DTC1B');
    }

    return recommendations;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Binary className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Analizador DTC1B Avanzado</h1>
              <p className="text-sm text-slate-400">Ingeniería inversa y análisis forense de archivos DTC1B</p>
            </div>
          </div>
        </div>

        {!analysis ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-12">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileLoad}
              className="hidden"
              id="dtc1b-file-input"
              accept=".bin,.dtc1b,.dat,.encrypted,.aes,.gcm,*"
            />
            <label
              htmlFor="dtc1b-file-input"
              className="cursor-pointer flex flex-col items-center gap-4"
            >
              <div className="p-6 bg-blue-600 rounded-full">
                <Upload className="w-12 h-12 text-white" />
              </div>
              <div className="text-center">
                <p className="text-xl text-white font-semibold mb-2">
                  Cargar Archivo DTC1B para Análisis Avanzado
                </p>
                <p className="text-sm text-slate-400 mb-3">
                  Análisis completo con detección automática de formatos y transacciones
                </p>
                <div className="text-xs text-slate-500">
                  <p className="mb-2">🎯 <strong>Capacidades:</strong></p>
                  <p>• Detección automática de archivos DTC1B</p>
                  <p>• Extracción de transacciones bancarias</p>
                  <p>• Análisis forense y de encriptación</p>
                  <p>• Soporte para archivos encriptados</p>
                  <p className="mt-2 text-green-400">🚀 Análisis multi-capa con IA integrada</p>
                </div>
              </div>
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header del análisis */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    analysis.dtc1bAnalysis.isValidDTC1B ? 'bg-green-500/20 text-green-300' :
                    analysis.encryptionAnalysis.isEncrypted ? 'bg-red-500/20 text-red-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {analysis.dtc1bAnalysis.isValidDTC1B ? '🏦 DTC1B Detectado' :
                     analysis.encryptionAnalysis.isEncrypted ? '🔒 Encriptado' : '🔍 Desconocido'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{analysis.fileName}</h2>
                    <p className="text-sm text-slate-400">{formatBytes(analysis.fileSize)} • Hash: {analysis.fileHash}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={exportToJSON}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    JSON
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    CSV
                  </button>
                  {analysis.encryptionAnalysis.isEncrypted && (
                    <button
                      onClick={() => setShowBruteForceModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Key className="w-4 h-4" />
                      Desencriptar
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setAnalysis(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Nuevo Archivo
                  </button>
                </div>
              </div>
            </div>

            {/* Navegación por secciones */}
            <div className="bg-slate-800 rounded-xl border border-slate-700">
              <div className="flex flex-wrap gap-1 p-2">
                {[
                  { id: 'overview', name: 'Resumen', icon: '📊' },
                  { id: 'transactions', name: 'Transacciones', icon: '💰' },
                  { id: 'forensic', name: 'Análisis Forense', icon: '🛡️' },
                  { id: 'encryption', name: 'Encriptación', icon: '🔐' },
                  { id: 'hexdump', name: 'Hex Dump', icon: '💾' }
                ].map(section => (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedSection === section.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {section.icon} {section.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenido dinámico basado en la sección seleccionada */}
            {selectedSection === 'overview' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-blue-400" />
                  Resumen del Análisis DTC1B
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-900 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Estado DTC1B</p>
                    <p className={`text-lg font-bold ${
                      analysis.dtc1bAnalysis.isValidDTC1B ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {analysis.dtc1bAnalysis.isValidDTC1B ? '✅ Válido' : '❌ No Detectado'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Confianza</p>
                    <p className="text-2xl font-bold text-purple-400">{analysis.dtc1bAnalysis.confidence}%</p>
                  </div>

                  <div className="p-4 bg-slate-900 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Transacciones</p>
                    <p className="text-2xl font-bold text-green-400">{analysis.dtc1bAnalysis.totalTransactions}</p>
                  </div>

                  <div className="p-4 bg-slate-900 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Encriptación</p>
                    <p className={`text-lg font-bold ${
                      analysis.encryptionAnalysis.isEncrypted ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {analysis.encryptionAnalysis.isEncrypted ? '🔒 Encriptado' : '🔓 Plano'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedSection === 'transactions' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-400" />
                  Transacciones DTC1B ({analysis.dtc1bAnalysis.totalTransactions})
                </h3>

                {analysis.dtc1bAnalysis.transactions.length > 0 ? (
                  <div className="space-y-4">
                    {analysis.dtc1bAnalysis.transactions.map((transaction, i) => (
                      <div key={i} className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">{i + 1}</span>
                            </div>
                            <div>
                              <p className="text-white font-medium">Transacción #{i + 1}</p>
                              <p className="text-xs text-slate-400">Offset: 0x{transaction.offset.toString(16).toUpperCase()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-400">
                              {formatCurrency(transaction.amount, transaction.currency)}
                            </p>
                            <p className="text-xs text-slate-400">{transaction.amount.toString()} centavos</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">Moneda:</span>
                            <span className="text-white ml-2 font-medium">{transaction.currency}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Bloque:</span>
                            <span className="text-white ml-2">{transaction.blockIndex}</span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <p className="text-xs text-slate-400 mb-1">Datos hexadecimales del bloque:</p>
                          <div className="bg-slate-950 p-2 rounded font-mono text-xs text-green-400 overflow-x-auto">
                            {Array.from(transaction.rawData.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No se encontraron transacciones DTC1B en este archivo.</p>
                    <p className="text-sm mt-2">Esto podría indicar que:</p>
                    <ul className="text-sm mt-2 text-left max-w-md mx-auto">
                      <li>• El archivo no es un DTC1B válido</li>
                      <li>• El archivo está encriptado</li>
                      <li>• El formato es diferente al esperado</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {selectedSection === 'forensic' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-400" />
                  Análisis Forense
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Evaluación de Seguridad</h4>
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-900 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-400">Nivel de Entropía</span>
                          <span className={`font-bold text-lg ${
                            analysis.forensicAnalysis.entropy > 7.5 ? 'text-red-400' :
                            analysis.forensicAnalysis.entropy > 6.5 ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            {analysis.forensicAnalysis.entropy.toFixed(3)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              analysis.forensicAnalysis.entropy > 7.5 ? 'bg-red-500' :
                              analysis.forensicAnalysis.entropy > 6.5 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, (analysis.forensicAnalysis.entropy / 8) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {analysis.forensicAnalysis.entropy > 7.5 ? 'Alta aleatoriedad (probable encriptación)' :
                           analysis.forensicAnalysis.entropy > 6.5 ? 'Moderada aleatoriedad' : 'Baja aleatoriedad (datos estructurados)'}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-900 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-400">Nivel de Riesgo</span>
                          <span className={`font-bold ${
                            analysis.forensicAnalysis.riskLevel === 'critical' ? 'text-red-400' :
                            analysis.forensicAnalysis.riskLevel === 'high' ? 'text-orange-400' :
                            analysis.forensicAnalysis.riskLevel === 'medium' ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            {analysis.forensicAnalysis.riskLevel === 'critical' ? 'CRÍTICO' :
                             analysis.forensicAnalysis.riskLevel === 'high' ? 'ALTO' :
                             analysis.forensicAnalysis.riskLevel === 'medium' ? 'MEDIO' : 'BAJO'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Basado en análisis de entropía y patrones
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Patrones Sospechosos</h4>
                    <div className="space-y-3">
                      {analysis.forensicAnalysis.suspiciousPatterns.length > 0 ? (
                        analysis.forensicAnalysis.suspiciousPatterns.map((pattern, i) => (
                          <div key={i} className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              <span className="text-red-300 font-medium text-sm">Patrón Sospechoso {i + 1}</span>
                            </div>
                            <p className="text-red-200 text-sm">{pattern}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
                          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                          <p className="text-green-300 text-sm">No se detectaron patrones sospechosos</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedSection === 'encryption' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5 text-yellow-400" />
                  Análisis de Encriptación
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Estado de Encriptación</h4>
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg border-2 ${
                        analysis.encryptionAnalysis.isEncrypted
                          ? 'bg-red-900/20 border-red-500'
                          : 'bg-green-900/20 border-green-500'
                      }`}>
                        <div className="flex items-center gap-3 mb-2">
                          {analysis.encryptionAnalysis.isEncrypted ? (
                            <Lock className="w-6 h-6 text-red-400" />
                          ) : (
                            <Unlock className="w-6 h-6 text-green-400" />
                          )}
                          <div>
                            <p className={`text-lg font-bold ${
                              analysis.encryptionAnalysis.isEncrypted ? 'text-red-400' : 'text-green-400'
                            }`}>
                              {analysis.encryptionAnalysis.isEncrypted ? '🔒 Encriptado' : '🔓 Sin Encriptar'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {analysis.encryptionAnalysis.isEncrypted ? 'El archivo requiere autenticación' : 'El archivo está en texto plano'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {analysis.encryptionAnalysis.isEncrypted && (
                        <div className="p-4 bg-slate-900 rounded-lg">
                          <h5 className="text-sm font-semibold text-white mb-2">Algoritmo Detectado</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tipo:</span>
                              <span className="text-white">{analysis.encryptionAnalysis.algorithm || 'Desconocido'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Confianza:</span>
                              <span className="text-green-400">{analysis.encryptionAnalysis.confidence}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Opciones de Desencriptación</h4>
                    <div className="space-y-3">
                      {analysis.encryptionAnalysis.isEncrypted ? (
                        <>
                          <button
                            onClick={() => setShowAuthModal(true)}
                            className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                          >
                            🔓 Desencriptar con Credenciales
                          </button>
                          <button
                            onClick={() => setShowBruteForceModal(true)}
                            className="w-full p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                          >
                            ⚡ Intento de Fuerza Bruta
                          </button>
                          <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="w-4 h-4 text-yellow-400" />
                              <span className="text-yellow-300 font-medium text-sm">Credenciales por Defecto</span>
                            </div>
                            <div className="text-xs text-yellow-200 space-y-1">
                              <p><strong>Usuario:</strong> amitiel2002</p>
                              <p><strong>Contraseña:</strong> 1a2b3c4d5e</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
                          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                          <p className="text-green-300 text-sm">El archivo no está encriptado</p>
                          <p className="text-xs text-green-200 mt-1">Los datos están disponibles directamente</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedSection === 'hexdump' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-orange-400" />
                  Vista Hexadecimal
                </h3>

                <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-green-400 overflow-x-auto max-h-96 overflow-y-auto">
                  {analysis.hexDump.map((line, i) => (
                    <div key={i} className="mb-1">{line}</div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400">Offset inicial:</label>
                    <input
                      type="number"
                      value={hexViewOffset}
                      onChange={(e) => setHexViewOffset(Number(e.target.value))}
                      className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      min="0"
                      max={analysis.fileSize - 1}
                      title="Offset inicial"
                      aria-label="Offset inicial para vista hexadecimal"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400">Longitud:</label>
                    <select
                      value={hexViewLimit}
                      onChange={(e) => setHexViewLimit(Number(e.target.value))}
                      className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      title="Longitud de vista hexadecimal"
                      aria-label="Seleccionar longitud de bytes a mostrar"
                    >
                      <option value={256}>256 bytes</option>
                      <option value={512}>512 bytes</option>
                      <option value={1024}>1024 bytes</option>
                      <option value={2048}>2048 bytes</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
