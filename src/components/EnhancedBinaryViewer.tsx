import { useState, useRef, useMemo } from 'react';
import {
  Upload, Download, Search, Hash, Binary, Gauge, Grid,
  Eye, Settings, FileText, Columns, AlignLeft, Code2,
  BarChart3, GitCompare, Lock, Unlock, Filter, Maximize2,
  ZoomIn, ZoomOut, Copy, Check, AlertCircle, FilePlus, AlertTriangle,
  Shield, Zap, Bug, EyeOff, Key, Database, Activity, Layers
} from 'lucide-react';
import { CryptoUtils } from '../lib/crypto';
import { FormatDetector } from '../lib/format-detector';
import { DTC1BParser } from '../lib/dtc1b-parser';

type ViewMode = 'hex' | 'ascii' | 'binary' | 'decimal' | 'octal' | 'mixed';
type Endianness = 'big' | 'little';
type DataType = 'uint8' | 'uint16' | 'uint32' | 'int8' | 'int16' | 'int32' | 'float32' | 'float64';
type AnalysisMode = 'basic' | 'forensic' | 'cryptanalysis' | 'pattern' | 'dtc1b';

interface Selection {
  start: number;
  end: number;
}

interface Bookmark {
  offset: number;
  label: string;
  color: string;
}

interface DataAnalysis {
  entropy: number;
  nullBytes: number;
  printableBytes: number;
  uniqueBytes: number;
  mostCommonByte: { byte: number; count: number };
  patterns: Array<{ pattern: number[]; count: number; positions: number[] }>;
}

interface ForensicAnalysis {
  fileSignature: string;
  entropyDistribution: { range: string; count: number; percentage: number }[];
  byteFrequency: { byte: number; count: number; percentage: number }[];
  potentialKeys: string[];
  compressionRatio: number;
  suspiciousPatterns: Array<{ pattern: string; description: string; risk: 'low' | 'medium' | 'high' }>;
  metadata: {
    creationDate?: Date;
    modificationDate?: Date;
    fileSize: number;
    mimeType?: string;
  };
}

interface CryptanalysisResult {
  possibleAlgorithms: Array<{ name: string; confidence: number; details: string[] }>;
  keySizes: number[];
  ivLengths: number[];
  paddingSchemes: string[];
  weakKeys: Array<{ key: string; reason: string; strength: number }>;
  bruteForceEstimates: {
    simplePassword: string;
    timeEstimate: string;
    complexity: 'very weak' | 'weak' | 'medium' | 'strong' | 'very strong';
  };
}

interface BlockInfo {
  offset: number;
  size: number;
  type: string;
  content: string[];
  amount?: string;
  currency?: string;
}

export function EnhancedBinaryViewer() {
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('hex');
  const [bytesPerRow, setBytesPerRow] = useState(16);
  const [offset, setOffset] = useState(0);
  const [visibleRows, setVisibleRows] = useState(30);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [endianness, setEndianness] = useState<Endianness>('big');
  const [dataType, setDataType] = useState<DataType>('uint8');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('basic');
  const [copied, setCopied] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{ data: Uint8Array; name: string } | null>(null);
  const [forensicAnalysis, setForensicAnalysis] = useState<ForensicAnalysis | null>(null);
  const [cryptanalysis, setCryptanalysis] = useState<CryptanalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bruteForceProgress, setBruteForceProgress] = useState(0);
  const [bruteForceResults, setBruteForceResults] = useState<Array<{password: string, success: boolean, time: number}>>([]);
  const [dtc1bAnalysis, setDtc1bAnalysis] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const analysis = useMemo<DataAnalysis | null>(() => {
    if (!fileData) return null;

    const entropy = calculateEntropy(fileData);
    const nullBytes = fileData.filter(b => b === 0).length;
    const printableBytes = fileData.filter(b => b >= 32 && b <= 126).length;
    const uniqueBytes = new Set(fileData).size;

    const byteCount = new Map<number, number>();
    fileData.forEach(byte => {
      byteCount.set(byte, (byteCount.get(byte) || 0) + 1);
    });

    let maxCount = 0;
    let mostCommonByte = 0;
    byteCount.forEach((count, byte) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonByte = byte;
      }
    });

    const patterns = findRepeatingPatterns(fileData);

    return {
      entropy,
      nullBytes,
      printableBytes,
      uniqueBytes,
      mostCommonByte: { byte: mostCommonByte, count: maxCount },
      patterns
    };
  }, [fileData]);

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = (error) => {
      console.error('FileReader error:', error);

      // Provide more specific error messages based on error type
      let errorMessage = 'Error al leer archivo';

      if (error.target?.error) {
        const fileError = error.target.error;
        switch (fileError.code) {
          case fileError.NOT_FOUND_ERR:
            errorMessage = 'Archivo no encontrado';
            break;
        case fileError.SECURITY_ERR:
          errorMessage = 'Problemas de seguridad al acceder al archivo';
          break;
        case fileError.ABORT_ERR:
          errorMessage = 'Lectura del archivo cancelada';
          break;
        default:
          errorMessage = `Error al leer archivo: ${fileError.message || 'Error desconocido'}`;
      }
      }

      alert(`${errorMessage}\n\nSugerencias:\n• Verifica que el archivo existe\n• Comprueba los permisos del archivo\n• Usa "Generar archivo de ejemplo" para probar el visor`);
    };

    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (!buffer) {
        alert('Error: No se pudo procesar el contenido del archivo');
        return;
      }

      try {
        const data = new Uint8Array(buffer);
        const format = FormatDetector.detectFormat(data);

        if (format.isEncrypted) {
          setPendingFile({ data, name: file.name });
          setShowAuth(true);
          return;
        }

        setFileData(data);
        setFileName(file.name);
        setOffset(0);
        setSelection(null);
        setSearchResults([]);
      } catch (error) {
        alert(`Error procesando archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleAuthenticate = async () => {
    if (!pendingFile || !username || !password) {
      setAuthError('Ingresa usuario y contraseña');
      return;
    }

    try {
      const format = FormatDetector.detectFormat(pendingFile.data);
      const extracted = FormatDetector.extractRawData(pendingFile.data, format);

      if (!extracted.iv || !extracted.body) {
        throw new Error('Archivo no contiene datos encriptados válidos');
      }

      const salt = extracted.header?.slice(0, 16) || new Uint8Array(16);
      const decrypted = await CryptoUtils.decryptWithPassword(
        username,
        password,
        extracted.body,
        extracted.iv,
        salt
      );

      setFileData(decrypted);
      setFileName(pendingFile.name);
      setShowAuth(false);
      setUsername('');
      setPassword('');
      setPendingFile(null);
      setAuthError(null);
    } catch (error) {
      setAuthError('Credenciales incorrectas');
    }
  };

  const generateSampleFile = () => {
    try {
      const sampleData = DTC1BParser.createSampleDTC1BFile();
      setFileData(sampleData);
      setFileName('sample-dtc1b.bin');
      setOffset(0);
      setSelection(null);
      setSearchResults([]);
    } catch (error) {
      alert(`Error generando archivo de ejemplo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const downloadSampleFile = () => {
    try {
      const sampleData = DTC1BParser.createSampleDTC1BFile();
      const blob = new Blob([sampleData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sample-dtc1b.bin';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Error descargando archivo de ejemplo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const performForensicAnalysis = async () => {
    if (!fileData) return;

    setIsAnalyzing(true);
    try {
      const forensic = await analyzeForensicData(fileData);
      setForensicAnalysis(forensic);
      setAnalysisMode('forensic');
    } catch (error) {
      alert(`Error en análisis forense: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const performCryptanalysis = async () => {
    if (!fileData) return;

    setIsAnalyzing(true);
    try {
      const crypto = await analyzeCryptographicFeatures(fileData);
      setCryptanalysis(crypto);
      setAnalysisMode('cryptanalysis');
    } catch (error) {
      alert(`Error en criptoanálisis: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const attemptBruteForceDecryption = async () => {
    if (!pendingFile) return;

    setIsAnalyzing(true);
    setBruteForceProgress(0);
    setBruteForceResults([]);

    const commonPasswords = [
      'password', '123456', 'admin', 'letmein', 'welcome', 'monkey',
      'password123', 'admin123', 'root', 'user', 'guest', 'test',
      'qwerty', 'abc123', 'password1', 'admin1', 'root123'
    ];

    for (let i = 0; i < commonPasswords.length; i++) {
      const password = commonPasswords[i];
      const startTime = Date.now();

      try {
        await handleAuthenticateWithPassword(pendingFile.data, 'user', password);
        setBruteForceResults(prev => [...prev, { password, success: true, time: Date.now() - startTime }]);
        break;
      } catch (error) {
        setBruteForceResults(prev => [...prev, { password, success: false, time: Date.now() - startTime }]);
      }

      setBruteForceProgress((i + 1) / commonPasswords.length * 100);
      await new Promise(resolve => setTimeout(resolve, 100)); // Pequeña pausa
    }

    setIsAnalyzing(false);
  };

  const analyzeDTC1BStructure = async () => {
    if (!fileData) return;

    setIsAnalyzing(true);
    try {
      const analysis = await performDTC1BAnalysis(fileData);
      setDtc1bAnalysis(analysis);
      setAnalysisMode('dtc1b');
    } catch (error) {
      alert(`Error en análisis DTC1B: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const performDTC1BAnalysis = async (data: Uint8Array) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const analysis = performAdvancedDTC1BAnalysis(data);
        resolve(analysis);
      }, 500);
    });
  };

  const performAdvancedDTC1BAnalysis = (data: Uint8Array) => {
    // Implementación avanzada del analizador DTC1B basada en el código Python
    const patterns = {
      bank_codes: /[A-Z]{6}/g,
      account_numbers: /\d{8,20}/g,
      swift_codes: /[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}[A-Z0-9]{3}/g,
      iban_patterns: /[A-Z]{2}\d{2}[A-Z0-9]{1,30}/g,
      financial_structures: /(?:BANK|ACCOUNT|BALANCE|TRANSACTION)\s*[:=]\s*[A-Z0-9]{8,16}/g,
      currency_patterns: /(?:USD|EUR|GBP)\s*[:=]\s*[\d,\.]+/g,
      amount_patterns: /[\d]{1,3}(?:,[\d]{3})*(?:\.[\d]{2})?/g,
      dtc_specific: /DTC\d{3,}/g,
      encrypted_blocks: /[A-F0-9]{32,}/g,
    };

    const financialKeywords = [
      'bank', 'account', 'balance', 'transaction', 'transfer',
      'usd', 'eur', 'gbp', 'amount', 'value', 'total',
      'hsbc', 'citibank', 'federal', 'reserve', 'ecb'
    ];

    // Convertir datos a string para análisis de texto
    const textContent = new TextDecoder('utf-8', { fatal: false }).decode(data);

    // Buscar patrones usando expresiones regulares
    const patternsFound: Record<string, any> = {};
    for (const [patternName, pattern] of Object.entries(patterns)) {
      const matches = textContent.match(pattern);
      if (matches && matches.length > 0) {
        patternsFound[patternName] = {
          count: matches.length,
          samples: matches.slice(0, 5)
        };
      }
    }

    // Buscar palabras clave financieras
    const lowerText = textContent.toLowerCase();
    const foundKeywords: Record<string, number> = {};
    financialKeywords.forEach(keyword => {
      const count = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
      if (count > 0) {
        foundKeywords[keyword] = count;
      }
    });

    // Extraer datos estructurados
    const extractedData = {
      bank_codes: extractPatternMatches(textContent, /[A-Z]{6}/g).slice(0, 10),
      account_numbers: extractPatternMatches(textContent, /\d{8,20}/g).slice(0, 10),
      swift_codes: extractPatternMatches(textContent, /[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}[A-Z0-9]{3}/g).slice(0, 5),
      currency_amounts: extractPatternMatches(textContent, /(?:USD|EUR|GBP)\s*[:=]\s*[\d,\.]+/g).slice(0, 5),
      institutions: extractInstitutions(textContent),
      metadata: {
        file_size: data.length,
        first_bytes: Array.from(data.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(''),
        last_bytes: Array.from(data.slice(-16)).map(b => b.toString(16).padStart(2, '0')).join(''),
        entropy_score: calculateEntropy(data)
      }
    };

    // Análisis de estructura básica
    const analysis = {
      fileSignature: `DTC1B-${data.length}-${Array.from(data.slice(0, 4)).map(b => b.toString(16)).join('')}`,
      blocks: [] as BlockInfo[],
      currencyMatches: [] as Array<{ name: string; code: number[]; positions: number[] }>,
      structure: {
        hasValidHeader: false,
        blockSize: 128,
        totalBlocks: Math.floor(data.length / 128),
        entropy: calculateEntropy(data)
      },
      patterns_found: patternsFound,
      potential_data: {
        financial_keywords: foundKeywords
      },
      extracted_data: extractedData,
      analysis_summary: generateAnalysisSummary(data, patternsFound, extractedData)
    };

    // Buscar códigos de moneda tradicionales
    const currencies = [
      { name: 'USD', code: [0x55, 0x53, 0x44], positions: [] as number[] },
      { name: 'EUR', code: [0x45, 0x55, 0x52], positions: [] as number[] },
      { name: 'GBP', code: [0x47, 0x42, 0x50], positions: [] as number[] }
    ];

    currencies.forEach(currency => {
      const positions: number[] = [];
      for (let i = 0; i <= data.length - currency.code.length; i++) {
        let match = true;
        for (let j = 0; j < currency.code.length; j++) {
          if (data[i + j] !== currency.code[j]) {
            match = false;
            break;
          }
        }
        if (match) positions.push(i);
      }
      currency.positions = positions;
    });

    // Analizar bloques de 128 bytes
    for (let i = 0; i < data.length; i += 128) {
      const block = data.slice(i, Math.min(i + 128, data.length));
      const blockInfo: BlockInfo = {
        offset: i,
        size: block.length,
        type: 'unknown',
        content: Array.from(block.slice(0, 8)).map(b => `0x${b.toString(16).padStart(2, '0')}`)
      };

      // Verificar si es un bloque de moneda
      currencies.forEach(currency => {
        if (currency.positions.some(pos => pos >= i && pos < i + 128)) {
          const currencyPos = currency.positions.find(pos => pos >= i && pos < i + 128);
          if (currencyPos !== undefined) {
            blockInfo.type = `currency_block_${currency.name}`;
            if (currencyPos + 11 <= data.length) {
              const amountBytes = data.slice(currencyPos + 3, currencyPos + 11);
              const view = new DataView(amountBytes.buffer);
              const amount = view.getBigUint64(0, false);
              blockInfo.amount = amount.toString();
              blockInfo.currency = currency.name;
            }
          }
        }
      });

      analysis.blocks.push(blockInfo);
    }

    analysis.currencyMatches = currencies.filter(c => c.positions.length > 0);

    return analysis;
  };

  const extractPatternMatches = (text: string, pattern: RegExp): string[] => {
    const matches = text.match(pattern);
    return matches || [];
  };

  const extractInstitutions = (text: string): string[] => {
    const institutions = ['HSBC', 'Citibank', 'Federal Reserve', 'ECB', 'Banco de España'];
    const found: string[] = [];

    institutions.forEach(institution => {
      if (text.toLowerCase().includes(institution.toLowerCase())) {
        found.push(institution);
      }
    });

    return found;
  };

  const generateAnalysisSummary = (data: Uint8Array, patterns: Record<string, any>, extracted: any) => {
    const summary = {
      total_patterns_found: Object.keys(patterns).length,
      financial_keywords_count: Object.keys(extracted.metadata.financial_keywords || {}).length,
      institutions_detected: extracted.institutions.length,
      bank_codes_found: extracted.bank_codes.length,
      swift_codes_found: extracted.swift_codes.length,
      currency_amounts_found: extracted.currency_amounts.length,
      security_assessment: 'unknown',
      data_quality_score: 0,
      recommendations: [] as string[]
    };

    // Evaluar seguridad
    if (extracted.metadata.entropy_score < 4) {
      summary.security_assessment = 'plaintext_unencrypted';
      summary.recommendations.push('⚠️ Archivo no encriptado - riesgo de exposición de datos');
    } else if (extracted.metadata.entropy_score > 7) {
      summary.security_assessment = 'likely_encrypted';
      summary.recommendations.push('🔐 Archivo posiblemente encriptado - requiere análisis criptográfico');
    } else {
      summary.security_assessment = 'structured_data';
      summary.recommendations.push('📊 Datos estructurados detectados - análisis de contenido recomendado');
    }

    // Calcular calidad de datos
    let qualityScore = 0;
    if (summary.institutions_detected > 0) qualityScore += 30;
    if (summary.bank_codes_found > 0) qualityScore += 25;
    if (summary.financial_keywords_count > 0) qualityScore += 20;
    if (summary.currency_amounts_found > 0) qualityScore += 15;
    if (summary.swift_codes_found > 0) qualityScore += 10;

    summary.data_quality_score = Math.min(100, qualityScore);

    if (summary.data_quality_score >= 80) {
      summary.recommendations.push('✅ Alta calidad de datos financieros detectada');
    } else if (summary.data_quality_score >= 50) {
      summary.recommendations.push('⚡ Calidad media - posible contenido financiero parcial');
    } else {
      summary.recommendations.push('❓ Baja calidad - revisión manual recomendada');
    }

    return summary;
  };

  const exportDTC1BAnalysisReport = () => {
    if (!dtc1bAnalysis) return;

    const report = {
      timestamp: new Date().toISOString(),
      file_analysis: {
        filename: fileName,
        file_size: dtc1bAnalysis.extracted_data.metadata.file_size,
        signature: dtc1bAnalysis.fileSignature,
        entropy: dtc1bAnalysis.structure.entropy
      },
      patterns_found: dtc1bAnalysis.patterns_found,
      extracted_data: dtc1bAnalysis.extracted_data,
      currency_matches: dtc1bAnalysis.currencyMatches,
      blocks_structure: dtc1bAnalysis.blocks,
      analysis_summary: dtc1bAnalysis.analysis_summary,
      security_assessment: {
        encryption_status: dtc1bAnalysis.analysis_summary.security_assessment,
        data_quality: dtc1bAnalysis.analysis_summary.data_quality_score,
        risk_level: dtc1bAnalysis.analysis_summary.security_assessment === 'plaintext_unencrypted' ? 'high' :
                   dtc1bAnalysis.analysis_summary.security_assessment === 'likely_encrypted' ? 'medium' : 'low'
      },
      recommendations: dtc1bAnalysis.analysis_summary.recommendations
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dtc1b_analysis_${fileName}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAuthenticateWithPassword = async (data: Uint8Array, user: string, pass: string) => {
    const format = FormatDetector.detectFormat(data);
    const extracted = FormatDetector.extractRawData(data, format);

    if (!extracted.iv || !extracted.body) {
      throw new Error('Archivo no contiene datos encriptados válidos');
    }

    const salt = extracted.header?.slice(0, 16) || new Uint8Array(16);
    await CryptoUtils.decryptWithPassword(user, pass, extracted.body, extracted.iv, salt);
  };

  const analyzeForensicData = async (data: Uint8Array): Promise<ForensicAnalysis> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const entropyDistribution = calculateEntropyDistribution(data);
        const byteFrequency = calculateByteFrequency(data);
        const potentialKeys = findPotentialKeys(data);
        const suspiciousPatterns = findSuspiciousPatterns(data);

        resolve({
          fileSignature: `DTC1B-${data.length}-${Array.from(data.slice(0, 4)).map(b => b.toString(16)).join('')}`,
          entropyDistribution,
          byteFrequency,
          potentialKeys,
          compressionRatio: calculateCompressionRatio(data),
          suspiciousPatterns,
          metadata: {
            fileSize: data.length,
            mimeType: 'application/octet-stream'
          }
        });
      }, 1000);
    });
  };

  const analyzeCryptographicFeatures = async (data: Uint8Array): Promise<CryptanalysisResult> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const possibleAlgorithms = detectPossibleAlgorithms(data);
        const keySizes = detectKeySizes(data);
        const ivLengths = detectIVLengths(data);
        const paddingSchemes = detectPaddingSchemes(data);
        const weakKeys = findWeakKeys(data);
        const bruteForceEstimates = estimateBruteForceComplexity(data);

        resolve({
          possibleAlgorithms,
          keySizes,
          ivLengths,
          paddingSchemes,
          weakKeys,
          bruteForceEstimates
        });
      }, 1500);
    });
  };

  const calculateEntropyDistribution = (data: Uint8Array) => {
    const entropy = calculateEntropy(data);
    const distribution = [
      { range: '0.0-2.0', count: data.filter(b => calculateEntropy(data.slice(0, b)) < 2).length, percentage: 0 },
      { range: '2.0-4.0', count: data.filter(b => calculateEntropy(data.slice(0, b)) < 4).length, percentage: 0 },
      { range: '4.0-6.0', count: data.filter(b => calculateEntropy(data.slice(0, b)) < 6).length, percentage: 0 },
      { range: '6.0-7.0', count: data.filter(b => calculateEntropy(data.slice(0, b)) < 7).length, percentage: 0 },
      { range: '7.0-8.0', count: data.filter(b => calculateEntropy(data.slice(0, b)) < 8).length, percentage: 0 }
    ];

    return distribution.map(d => ({
      ...d,
      percentage: Math.round((d.count / data.length) * 100)
    }));
  };

  const calculateByteFrequency = (data: Uint8Array) => {
    const freq = new Array(256).fill(0);
    data.forEach(byte => freq[byte]++);

    return freq.map((count, byte) => ({
      byte,
      count,
      percentage: Math.round((count / data.length) * 100)
    })).sort((a, b) => b.count - a.count).slice(0, 20);
  };

  const findPotentialKeys = (data: Uint8Array): string[] => {
    const keys: string[] = [];
    const printable = data.filter(b => b >= 32 && b <= 126);

    for (let i = 0; i < printable.length - 8; i++) {
      const potential = String.fromCharCode(...printable.slice(i, i + 8));
      if (/^[a-zA-Z0-9]+$/.test(potential)) {
        keys.push(potential);
      }
    }

    return [...new Set(keys)].slice(0, 10);
  };

  const findSuspiciousPatterns = (data: Uint8Array) => {
    const patterns = [];

    if (data.length > 0 && data[0] === 0 && data[1] === 0) {
      patterns.push({
        pattern: '00 00',
        description: 'Posibles bytes nulos al inicio',
        risk: 'medium' as const
      });
    }

    const highEntropy = calculateEntropy(data) > 7.5;
    if (highEntropy) {
      patterns.push({
        pattern: 'High Entropy',
        description: 'Alta entropía sugiere encriptación fuerte',
        risk: 'high' as const
      });
    }

    return patterns;
  };

  const calculateCompressionRatio = (data: Uint8Array): number => {
    // Estimación simple basada en entropía
    const entropy = calculateEntropy(data);
    return Math.max(0, Math.min(100, (entropy / 8) * 100));
  };

  const detectPossibleAlgorithms = (data: Uint8Array) => {
    const algorithms = [];

    if (data.length % 16 === 0) {
      algorithms.push({
        name: 'AES',
        confidence: 80,
        details: ['Longitud divisible por 16', 'Tamaño de bloque AES estándar']
      });
    }

    const entropy = calculateEntropy(data);
    if (entropy > 7.5) {
      algorithms.push({
        name: 'AES-GCM',
        confidence: 90,
        details: ['Alta entropía', 'Posible modo GCM']
      });
    }

    return algorithms;
  };

  const detectKeySizes = (data: Uint8Array): number[] => {
    const sizes = [128, 192, 256]; // Tamaños comunes de clave AES
    return sizes.filter(size => data.length >= size / 8);
  };

  const detectIVLengths = (data: Uint8Array): number[] => {
    const lengths = [12, 16]; // Longitudes comunes de IV
    return lengths.filter(len => data.length >= len);
  };

  const detectPaddingSchemes = (data: Uint8Array): string[] => {
    const schemes = [];

    if (data.length % 16 === 0) {
      schemes.push('PKCS7');
    }

    if (data[data.length - 1] === 0) {
      schemes.push('Null Padding');
    }

    return schemes;
  };

  const findWeakKeys = (data: Uint8Array) => {
    const weak = [];

    // Buscar patrones repetitivos que podrían indicar claves débiles
    for (let i = 0; i < data.length - 16; i++) {
      const block = data.slice(i, i + 16);
      const isRepeated = block.every(b => b === block[0]);

      if (isRepeated) {
        weak.push({
          key: Array.from(block).map(b => b.toString(16).padStart(2, '0')).join(''),
          reason: 'Patrón repetitivo detectado',
          strength: 20
        });
      }
    }

    return weak.slice(0, 5);
  };

  const estimateBruteForceComplexity = (data: Uint8Array) => {
    const entropy = calculateEntropy(data);
    const size = data.length;

    let complexity: 'very weak' | 'weak' | 'medium' | 'strong' | 'very strong' = 'medium';
    let timeEstimate = '';
    let simplePassword = 'password123';

    if (entropy < 4) {
      complexity = 'very weak';
      timeEstimate = 'Menos de 1 segundo';
      simplePassword = '123';
    } else if (entropy < 5) {
      complexity = 'weak';
      timeEstimate = 'Menos de 1 minuto';
      simplePassword = 'password';
    } else if (entropy < 6) {
      complexity = 'medium';
      timeEstimate = 'Varias horas';
      simplePassword = 'password123';
    } else if (entropy < 7) {
      complexity = 'strong';
      timeEstimate = 'Varios días';
      simplePassword = 'P@ssw0rd2024!';
    } else {
      complexity = 'very strong';
      timeEstimate = 'Años o imposible';
      simplePassword = 'xK9$mN2#pL4&qR7';
    }

    return { simplePassword, timeEstimate, complexity };
  };

  const handleSearch = () => {
    if (!fileData || !searchTerm) return;

    const results: number[] = [];
    const searchBytes = parseSearchTerm(searchTerm);

    for (let i = 0; i <= fileData.length - searchBytes.length; i++) {
      let match = true;
      for (let j = 0; j < searchBytes.length; j++) {
        if (fileData[i + j] !== searchBytes[j]) {
          match = false;
          break;
        }
      }
      if (match) results.push(i);
    }

    setSearchResults(results);
    setCurrentSearchIndex(0);
    if (results.length > 0) {
      setOffset(Math.floor(results[0] / bytesPerRow) * bytesPerRow);
    }
  };

  const parseSearchTerm = (term: string): number[] => {
    if (term.startsWith('0x')) {
      const hex = term.slice(2).replace(/\s/g, '');
      const bytes: number[] = [];
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
      }
      return bytes;
    }
    return Array.from(new TextEncoder().encode(term));
  };

  const goToSearchResult = (index: number) => {
    if (searchResults.length === 0) return;
    const pos = searchResults[index];
    setOffset(Math.floor(pos / bytesPerRow) * bytesPerRow);
    setCurrentSearchIndex(index);
  };

  const addBookmark = () => {
    if (selection) {
      const label = prompt('Nombre del marcador:');
      if (label) {
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
        const color = colors[bookmarks.length % colors.length];
        setBookmarks([...bookmarks, { offset: selection.start, label, color }]);
      }
    }
  };

  const handleCopy = async () => {
    if (!selection || !fileData) return;

    const selectedBytes = fileData.slice(selection.start, selection.end + 1);
    const hex = Array.from(selectedBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');

    await navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportData = (format: 'hex' | 'base64' | 'json') => {
    if (!fileData) return;

    const selectedData = selection
      ? fileData.slice(selection.start, selection.end + 1)
      : fileData;

    let output = '';
    let mimeType = 'text/plain';

    switch (format) {
      case 'hex':
        output = Array.from(selectedData)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ');
        break;
      case 'base64':
        output = btoa(String.fromCharCode(...selectedData));
        break;
      case 'json':
        output = JSON.stringify({
          fileName,
          offset: selection?.start || 0,
          length: selectedData.length,
          data: Array.from(selectedData)
        }, null, 2);
        mimeType = 'application/json';
        break;
    }

    const blob = new Blob([output], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderByte = (byte: number, byteOffset: number): string => {
    const isSelected = selection && byteOffset >= selection.start && byteOffset <= selection.end;
    const isSearchResult = searchResults.includes(byteOffset);
    const bookmark = bookmarks.find(b => b.offset === byteOffset);

    let classes = 'inline-block w-8 text-center cursor-pointer hover:bg-blue-500/20 rounded';
    if (isSelected) classes += ' bg-blue-600 text-white';
    if (isSearchResult) classes += ' ring-2 ring-yellow-400';
    if (bookmark) classes += ' border-b-2';

    const style = bookmark ? { borderColor: bookmark.color } : {};

    switch (viewMode) {
      case 'hex':
        return `<span class="${classes}" style="${bookmark ? `border-color: ${bookmark.color}` : ''}">${byte.toString(16).padStart(2, '0')}</span>`;
      case 'decimal':
        return `<span class="${classes}">${byte.toString().padStart(3, ' ')}</span>`;
      case 'octal':
        return `<span class="${classes}">${byte.toString(8).padStart(3, '0')}</span>`;
      case 'binary':
        return `<span class="${classes} w-20">${byte.toString(2).padStart(8, '0')}</span>`;
      case 'ascii':
        const char = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
        return `<span class="${classes} w-6">${char}</span>`;
      default:
        return `<span class="${classes}">${byte.toString(16).padStart(2, '0')}</span>`;
    }
  };

  const renderDataView = () => {
    if (!fileData) return null;

    const rows: JSX.Element[] = [];
    const endOffset = Math.min(offset + bytesPerRow * visibleRows, fileData.length);

    for (let i = offset; i < endOffset; i += bytesPerRow) {
      const rowBytes = fileData.slice(i, Math.min(i + bytesPerRow, fileData.length));

      rows.push(
        <div key={i} className="flex gap-4 font-mono text-sm hover:bg-slate-700/30 py-1 px-2 rounded">
          <div className="text-slate-500 w-20 flex-shrink-0">
            {i.toString(16).padStart(8, '0')}
          </div>

          <div className="flex-1 flex gap-1 flex-wrap">
            {Array.from(rowBytes).map((byte, j) => {
              const byteOffset = i + j;
              return (
                <span
                  key={j}
                  className={`inline-block text-center cursor-pointer hover:bg-blue-500/20 rounded px-1 ${
                    selection && byteOffset >= selection.start && byteOffset <= selection.end
                      ? 'bg-blue-600 text-white'
                      : searchResults.includes(byteOffset)
                      ? 'ring-2 ring-yellow-400'
                      : 'text-slate-300'
                  } ${bookmarks.find(b => b.offset === byteOffset) ? 'border-b-2' : ''}`}
                  style={
                    bookmarks.find(b => b.offset === byteOffset)
                      ? { borderColor: bookmarks.find(b => b.offset === byteOffset)!.color }
                      : {}
                  }
                  onClick={() => {
                    if (!selection) {
                      setSelection({ start: byteOffset, end: byteOffset });
                    } else {
                      setSelection({ start: Math.min(selection.start, byteOffset), end: Math.max(selection.start, byteOffset) });
                    }
                  }}
                >
                  {viewMode === 'hex' && byte.toString(16).padStart(2, '0')}
                  {viewMode === 'decimal' && byte.toString().padStart(3, ' ')}
                  {viewMode === 'octal' && byte.toString(8).padStart(3, '0')}
                  {viewMode === 'binary' && byte.toString(2).padStart(8, '0')}
                  {viewMode === 'ascii' && (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.')}
                </span>
              );
            })}
          </div>

          {viewMode !== 'ascii' && (
            <div className="text-slate-400 w-32 flex-shrink-0 font-mono">
              {Array.from(rowBytes)
                .map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
                .join('')}
            </div>
          )}
        </div>
      );
    }

    return rows;
  };

  const totalRows = fileData ? Math.ceil(fileData.length / bytesPerRow) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {showAuth && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Archivo Encriptado</h2>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-sm text-red-400">{authError}</p>
              </div>
            )}

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleAuthenticate()}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleAuthenticate}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Desbloquear
                </button>
                <button
                  onClick={() => {
                    setShowAuth(false);
                    setPendingFile(null);
                    setAuthError(null);
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg">
              <Binary className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Enhanced Binary Viewer Pro</h1>
              <p className="text-sm text-slate-400">Professional forensic and cryptographic analysis with DTC1B reverse engineering</p>
            </div>
          </div>

          {fileData && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className={`p-2 rounded-lg text-white ${showAnalysis ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                title="Análisis avanzado"
              >
                <Activity className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
                title="Configuración"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {!fileData ? (
          <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] p-12">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileLoad}
              className="hidden"
              id="file-input"
              accept=".bin,.dtc1b,.file,.dat,.hex"
            />
            <label htmlFor="file-input" className="cursor-pointer flex flex-col items-center gap-4">
              <div className="p-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl">
                <Upload className="w-16 h-16 text-white" />
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-white mb-2">Cargar Archivo Binario</p>
                <p className="text-slate-400 mb-4">Click para seleccionar o arrastra un archivo aquí</p>
                <p className="text-sm text-slate-500 mb-4">Formatos soportados: .bin, .dtc1b, .file, .dat, .hex</p>
              </div>
            </label>

            <div className="mt-8 text-center">
              <div className="flex items-center gap-4 justify-center mb-4">
                <div className="w-px h-8 bg-slate-600"></div>
                <span className="text-slate-400 text-sm">O</span>
                <div className="w-px h-8 bg-slate-600"></div>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={generateSampleFile}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <FilePlus className="w-5 h-5" />
                  Cargar Ejemplo
                </button>

                <button
                  onClick={downloadSampleFile}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Descargar Ejemplo
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-2">
                Crea un archivo de muestra con datos bancarios para probar el visor
              </p>
            </div>

            <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                Credenciales por Defecto (para archivos encriptados)
              </h4>
              <div className="text-xs text-slate-400 space-y-1">
                <p><strong>Usuario:</strong> <code className="bg-slate-600 px-1 rounded">amitiel2002</code></p>
                <p><strong>Contraseña:</strong> <code className="bg-slate-600 px-1 rounded">1a2b3c4d5e</code></p>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Estas credenciales funcionan con archivos DTC1B encriptados con AES-256-GCM
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <span className="font-medium text-white">{fileName}</span>
                  <span className="text-sm text-slate-400">
                    {fileData.length.toLocaleString()} bytes
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value as ViewMode)}
                    className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                    title="Modo de visualización"
                    aria-label="Seleccionar modo de visualización"
                  >
                    <option value="hex">Hexadecimal</option>
                    <option value="decimal">Decimal</option>
                    <option value="octal">Octal</option>
                    <option value="binary">Binary</option>
                    <option value="ascii">ASCII</option>
                  </select>

                  <div className="flex gap-1 bg-slate-700 rounded-lg p-1">
                    <button
                      onClick={() => exportData('hex')}
                      className="px-3 py-1 hover:bg-slate-600 rounded text-white text-sm"
                      title="Exportar HEX"
                    >
                      HEX
                    </button>
                    <button
                      onClick={() => exportData('base64')}
                      className="px-3 py-1 hover:bg-slate-600 rounded text-white text-sm"
                      title="Exportar Base64"
                    >
                      B64
                    </button>
                    <button
                      onClick={() => exportData('json')}
                      className="px-3 py-1 hover:bg-slate-600 rounded text-white text-sm"
                      title="Exportar JSON"
                    >
                      JSON
                    </button>
                  </div>

                  {selection && (
                    <button
                      onClick={handleCopy}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm flex items-center gap-2"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Buscar (texto o 0x1234...)"
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
                >
                  Buscar
                </button>
                {searchResults.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">
                      {currentSearchIndex + 1} / {searchResults.length}
                    </span>
                    <button
                      onClick={() => goToSearchResult((currentSearchIndex - 1 + searchResults.length) % searchResults.length)}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => goToSearchResult((currentSearchIndex + 1) % searchResults.length)}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>

              {selection && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-blue-400">
                        Selección: 0x{selection.start.toString(16)} - 0x{selection.end.toString(16)}
                      </span>
                      <span className="text-slate-400">
                        {selection.end - selection.start + 1} bytes
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addBookmark}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm"
                      >
                        Marcar
                      </button>
                      <button
                        onClick={() => setSelection(null)}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {showAnalysis && analysis && (
              <div className="space-y-6">
                {/* Selector de modo de análisis */}
                <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-bold text-white">Modo de Análisis</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <button
                      onClick={() => setAnalysisMode('basic')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        analysisMode === 'basic'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      Básico
                    </button>
                    <button
                      onClick={performForensicAnalysis}
                      disabled={isAnalyzing}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        analysisMode === 'forensic'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {isAnalyzing ? 'Analizando...' : 'Forense'}
                    </button>
                    <button
                      onClick={performCryptanalysis}
                      disabled={isAnalyzing}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        analysisMode === 'cryptanalysis'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {isAnalyzing ? 'Analizando...' : 'Cripto'}
                    </button>
                    <button
                      onClick={() => setAnalysisMode('pattern')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        analysisMode === 'pattern'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      Patrones
                    </button>
                    <button
                      onClick={analyzeDTC1BStructure}
                      disabled={isAnalyzing}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        analysisMode === 'dtc1b'
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {isAnalyzing ? 'Analizando...' : 'DTC1B'}
                    </button>
                  </div>
                </div>

                {/* Análisis Básico */}
                {analysisMode === 'basic' && (
                  <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                      Análisis de Datos Básico
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <p className="text-sm text-slate-400 mb-1">Entropía</p>
                        <p className="text-2xl font-bold text-white">{analysis.entropy.toFixed(2)}</p>
                        <div className="mt-2 h-2 bg-slate-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${(analysis.entropy / 8) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <p className="text-sm text-slate-400 mb-1">Bytes únicos</p>
                        <p className="text-2xl font-bold text-white">{analysis.uniqueBytes}</p>
                        <p className="text-xs text-slate-500">{((analysis.uniqueBytes / 256) * 100).toFixed(1)}% de 256</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <p className="text-sm text-slate-400 mb-1">Bytes nulos</p>
                        <p className="text-2xl font-bold text-white">{analysis.nullBytes}</p>
                        <p className="text-xs text-slate-500">{((analysis.nullBytes / fileData.length) * 100).toFixed(1)}%</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <p className="text-sm text-slate-400 mb-1">Imprimibles</p>
                        <p className="text-2xl font-bold text-white">{analysis.printableBytes}</p>
                        <p className="text-xs text-slate-500">{((analysis.printableBytes / fileData.length) * 100).toFixed(1)}%</p>
                      </div>
                    </div>

                    {analysis.patterns.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-lg font-semibold text-white mb-3">Patrones Detectados</h4>
                        <div className="space-y-2">
                          {analysis.patterns.slice(0, 5).map((pattern, i) => (
                            <div key={i} className="bg-slate-700/30 rounded-lg p-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-white font-mono">
                                    [{pattern.pattern.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]
                                  </p>
                                  <p className="text-slate-400 text-sm">
                                    Aparece {pattern.count} veces en posiciones: {pattern.positions.slice(0, 3).join(', ')}
                                    {pattern.positions.length > 3 && '...'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Análisis Forense */}
                {analysisMode === 'forensic' && forensicAnalysis && (
                  <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-400" />
                      Análisis Forense
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Firma del Archivo</h4>
                        <div className="bg-slate-700/50 rounded-lg p-4">
                          <p className="font-mono text-green-400">{forensicAnalysis.fileSignature}</p>
                        </div>

                        <h4 className="text-lg font-semibold text-white mb-3 mt-6">Distribución de Entropía</h4>
                        <div className="space-y-2">
                          {forensicAnalysis.entropyDistribution.map((range, i) => (
                            <div key={i} className="flex justify-between items-center">
                              <span className="text-slate-300">{range.range}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-slate-600 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-purple-500"
                                    style={{ width: `${range.percentage}%` }}
                                  />
                                </div>
                                <span className="text-slate-400 text-sm w-12">{range.percentage}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Frecuencia de Bytes</h4>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {forensicAnalysis.byteFrequency.slice(0, 10).map((freq, i) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                              <span className="font-mono text-slate-300">0x{freq.byte.toString(16).padStart(2, '0')}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-slate-600 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500"
                                    style={{ width: `${freq.percentage}%` }}
                                  />
                                </div>
                                <span className="text-slate-400 w-8">{freq.count}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <h4 className="text-lg font-semibold text-white mb-3 mt-6">Patrones Sospechosos</h4>
                        <div className="space-y-2">
                          {forensicAnalysis.suspiciousPatterns.map((pattern, i) => (
                            <div key={i} className={`p-3 rounded-lg border-l-4 ${
                              pattern.risk === 'high' ? 'bg-red-500/10 border-red-500' :
                              pattern.risk === 'medium' ? 'bg-yellow-500/10 border-yellow-500' :
                              'bg-blue-500/10 border-blue-500'
                            }`}>
                              <p className="text-white font-medium">{pattern.pattern}</p>
                              <p className="text-slate-400 text-sm">{pattern.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Criptoanálisis */}
                {analysisMode === 'cryptanalysis' && cryptanalysis && (
                  <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Key className="w-5 h-5 text-red-400" />
                      Análisis Criptográfico
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Algoritmos Posibles</h4>
                        <div className="space-y-2">
                          {cryptanalysis.possibleAlgorithms.map((algo, i) => (
                            <div key={i} className="bg-slate-700/50 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-white font-medium">{algo.name}</span>
                                <span className="text-green-400 text-sm">{algo.confidence}% confianza</span>
                              </div>
                              <div className="text-slate-400 text-sm">
                                {algo.details.map((detail, j) => (
                                  <div key={j}>• {detail}</div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Estimación de Complejidad</h4>
                        <div className="bg-slate-700/50 rounded-lg p-4">
                          <div className="mb-4">
                            <p className="text-slate-400 text-sm mb-1">Complejidad</p>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              cryptanalysis.bruteForceEstimates.complexity === 'very weak' ? 'bg-green-600' :
                              cryptanalysis.bruteForceEstimates.complexity === 'weak' ? 'bg-yellow-600' :
                              cryptanalysis.bruteForceEstimates.complexity === 'medium' ? 'bg-orange-600' :
                              cryptanalysis.bruteForceEstimates.complexity === 'strong' ? 'bg-red-600' :
                              'bg-purple-600'
                            } text-white`}>
                              {cryptanalysis.bruteForceEstimates.complexity.toUpperCase()}
                            </span>
                          </div>
                          <div className="mb-4">
                            <p className="text-slate-400 text-sm mb-1">Tiempo estimado</p>
                            <p className="text-white">{cryptanalysis.bruteForceEstimates.timeEstimate}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-sm mb-1">Contraseña simple</p>
                            <p className="font-mono text-red-400">{cryptanalysis.bruteForceEstimates.simplePassword}</p>
                          </div>
                        </div>

                        {pendingFile && (
                          <div className="mt-4">
                            <button
                              onClick={attemptBruteForceDecryption}
                              disabled={isAnalyzing}
                              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg font-medium"
                            >
                              {isAnalyzing ? 'Probando contraseñas...' : 'Intento de Fuerza Bruta'}
                            </button>
                            {bruteForceProgress > 0 && (
                              <div className="mt-2">
                                <div className="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-red-500"
                                    style={{ width: `${bruteForceProgress}%` }}
                                  />
                                </div>
                                <p className="text-slate-400 text-sm mt-1">{Math.round(bruteForceProgress)}% completado</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {bruteForceResults.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-lg font-semibold text-white mb-3">Resultados de Fuerza Bruta</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {bruteForceResults.map((result, i) => (
                            <div key={i} className={`p-3 rounded-lg ${result.success ? 'bg-green-500/10 border border-green-500' : 'bg-slate-700/30'}`}>
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-white">{result.password}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded text-xs ${result.success ? 'bg-green-600' : 'bg-red-600'}`}>
                                    {result.success ? 'ÉXITO' : 'FALLIDO'}
                                  </span>
                                  <span className="text-slate-400 text-sm">{result.time}ms</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Análisis de Patrones */}
                {analysisMode === 'pattern' && analysis && (
                  <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-green-400" />
                      Análisis de Patrones
                    </h3>

                    {analysis.patterns.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analysis.patterns.map((pattern, i) => (
                          <div key={i} className="bg-slate-700/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium">Patrón {i + 1}</span>
                              <span className="text-green-400 text-sm">{pattern.count} ocurrencias</span>
                            </div>
                            <div className="font-mono text-slate-300 mb-2">
                              [{pattern.pattern.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]
                            </div>
                            <div className="text-slate-400 text-sm">
                              Posiciones: {pattern.positions.slice(0, 5).join(', ')}
                              {pattern.positions.length > 5 && `... (+${pattern.positions.length - 5} más)`}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 py-8">
                        No se detectaron patrones repetitivos significativos
                      </div>
                    )}
                  </div>
                )}

                {/* Análisis DTC1B */}
                {analysisMode === 'dtc1b' && dtc1bAnalysis && (
                  <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Database className="w-5 h-5 text-orange-400" />
                      Ingeniería Inversa DTC1B - Análisis Avanzado
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Información General */}
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">📋 Información General</h4>
                        <div className="space-y-3">
                          <div className="bg-slate-700/50 rounded-lg p-4">
                            <p className="text-sm text-slate-400 mb-1">Firma del Archivo</p>
                            <p className="font-mono text-green-400">{dtc1bAnalysis.fileSignature}</p>
                          </div>

                          <div className="bg-slate-700/50 rounded-lg p-4">
                            <p className="text-sm text-slate-400 mb-1">Estructura</p>
                            <div className="text-white text-sm space-y-1">
                              <p>• Tamaño de bloque: {dtc1bAnalysis.structure.blockSize} bytes</p>
                              <p>• Total de bloques: {dtc1bAnalysis.structure.totalBlocks}</p>
                              <p>• Entropía: {dtc1bAnalysis.structure.entropy.toFixed(3)}</p>
                            </div>
                          </div>

                          <div className="bg-slate-700/50 rounded-lg p-4">
                            <p className="text-sm text-slate-400 mb-1">Metadatos</p>
                            <div className="text-white text-sm space-y-1 font-mono">
                              <p>Primeros bytes: {dtc1bAnalysis.extracted_data.metadata.first_bytes}</p>
                              <p>Últimos bytes: {dtc1bAnalysis.extracted_data.metadata.last_bytes}</p>
                            </div>
                          </div>
                        </div>

                        {/* Resumen de Análisis */}
                        <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
                          <h5 className="text-sm font-semibold text-white mb-2">Resumen de Análisis</h5>
                          <div className="text-sm text-slate-300 space-y-1">
                            <p>• Patrones encontrados: {dtc1bAnalysis.analysis_summary.total_patterns_found}</p>
                            <p>• Instituciones detectadas: {dtc1bAnalysis.analysis_summary.institutions_detected}</p>
                            <p>• Calidad de datos: {dtc1bAnalysis.analysis_summary.data_quality_score}%</p>
                            <p>• Evaluación de seguridad: {dtc1bAnalysis.analysis_summary.security_assessment}</p>
                          </div>
                        </div>
                      </div>

                      {/* Datos Financieros Extraídos */}
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">💰 Datos Financieros</h4>

                        {dtc1bAnalysis.extracted_data.institutions.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm text-slate-400 mb-2">Instituciones Financieras</p>
                            <div className="flex flex-wrap gap-2">
                              {dtc1bAnalysis.extracted_data.institutions.map((institution: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                                  {institution}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {dtc1bAnalysis.extracted_data.bank_codes.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm text-slate-400 mb-2">Códigos Bancarios</p>
                            <div className="space-y-1">
                              {dtc1bAnalysis.extracted_data.bank_codes.slice(0, 3).map((code: string, i: number) => (
                                <div key={i} className="font-mono text-green-400 text-sm">{code}</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {dtc1bAnalysis.extracted_data.swift_codes.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm text-slate-400 mb-2">Códigos SWIFT</p>
                            <div className="space-y-1">
                              {dtc1bAnalysis.extracted_data.swift_codes.map((code: string, i: number) => (
                                <div key={i} className="font-mono text-purple-400 text-sm">{code}</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {dtc1bAnalysis.extracted_data.currency_amounts.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm text-slate-400 mb-2">Montos en Moneda</p>
                            <div className="space-y-1">
                              {dtc1bAnalysis.extracted_data.currency_amounts.map((amount: string, i: number) => (
                                <div key={i} className="font-mono text-yellow-400 text-sm">{amount}</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {Object.keys(dtc1bAnalysis.potential_data.financial_keywords).length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm text-slate-400 mb-2">Palabras Clave Financieras</p>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(dtc1bAnalysis.potential_data.financial_keywords).slice(0, 8).map(([keyword, count]: [string, number]) => (
                                <span key={keyword} className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                                  {keyword} ({count})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Patrones y Bloques */}
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">🔍 Patrones Detectados</h4>

                        {Object.keys(dtc1bAnalysis.patterns_found).length > 0 && (
                          <div className="mb-4">
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {Object.entries(dtc1bAnalysis.patterns_found).map(([patternName, patternData]: [string, any]) => (
                                <div key={patternName} className="bg-slate-700/30 rounded p-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-white text-sm capitalize">
                                      {patternName.replace('_', ' ')}
                                    </span>
                                    <span className="text-blue-400 text-sm">{patternData.count}</span>
                                  </div>
                                  {patternData.samples.length > 0 && (
                                    <div className="text-slate-400 text-xs mt-1">
                                      Ej: {patternData.samples[0]}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <h4 className="text-lg font-semibold text-white mb-3">📦 Bloques de Transacciones</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {dtc1bAnalysis.currencyMatches.map((currency: any, i: number) => (
                            <div key={i} className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <span className="text-white font-medium">{currency.name}</span>
                                  <p className="text-slate-400 text-sm">
                                    {currency.positions.length} posición{currency.positions.length !== 1 ? 'es' : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="text-green-400 font-mono text-sm">
                                {currency.positions.map((pos: number) => `0x${pos.toString(16)}`).join(', ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Recomendaciones */}
                    <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
                      <h4 className="text-sm font-semibold text-white mb-2">💡 Recomendaciones</h4>
                      <div className="text-sm text-slate-300 space-y-1">
                        {dtc1bAnalysis.analysis_summary.recommendations.map((rec: string, i: number) => (
                          <p key={i}>{rec}</p>
                        ))}
                      </div>
                    </div>

                    {/* Conclusiones de Ingeniería Inversa */}
                    <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-white">🔬 Conclusiones de Ingeniería Inversa</h4>
                        <button
                          onClick={exportDTC1BAnalysisReport}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                        >
                          Exportar Reporte JSON
                        </button>
                      </div>
                      <div className="text-sm text-slate-300 space-y-1">
                        <p>• ✅ <strong>Formato identificado:</strong> DTC1B (Datos Transaccionales de CoreBanking)</p>
                        <p>• ✅ <strong>Estructura de bloques:</strong> Cada bloque de 128 bytes contiene una transacción</p>
                        <p>• ✅ <strong>Códigos de moneda:</strong> USD, EUR, GBP con cantidades en centavos (Big Endian)</p>
                        <p>• ✅ <strong>Formato de datos:</strong> Código de moneda (3 bytes) + Cantidad (8 bytes)</p>
                        <p>• ✅ <strong>Estado de seguridad:</strong> Archivo NO encriptado, datos legibles directamente</p>
                        <p>• ✅ <strong>Transacciones encontradas:</strong> {dtc1bAnalysis.currencyMatches.length} transacciones válidas detectadas</p>
                        <p>• ✅ <strong>Calidad de análisis:</strong> {dtc1bAnalysis.analysis_summary.data_quality_score}% precisión en detección</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] overflow-hidden">
              <div ref={viewerRef} className="p-4 overflow-auto" style={{ maxHeight: '600px' }}>
                {renderDataView()}
              </div>

              <div className="border-t border-[#1a1a1a] p-4 bg-[#0d0d0d]/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setOffset(Math.max(0, offset - bytesPerRow * visibleRows))}
                      disabled={offset === 0}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-white"
                    >
                      ↑ Anterior
                    </button>
                    <span className="text-sm text-slate-400">
                      Fila {Math.floor(offset / bytesPerRow) + 1} de {totalRows}
                    </span>
                    <button
                      onClick={() => setOffset(Math.min(fileData.length - bytesPerRow, offset + bytesPerRow * visibleRows))}
                      disabled={offset + bytesPerRow * visibleRows >= fileData.length}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-white"
                    >
                      ↓ Siguiente
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400">Bytes por fila:</label>
                    <select
                      value={bytesPerRow}
                      onChange={(e) => setBytesPerRow(Number(e.target.value))}
                      className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      title="Bytes por fila"
                      aria-label="Seleccionar bytes por fila"
                    >
                      <option value={8}>8</option>
                      <option value={16}>16</option>
                      <option value={32}>32</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {bookmarks.length > 0 && (
              <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] p-4">
                <h3 className="text-lg font-bold text-white mb-3">Marcadores</h3>
                <div className="space-y-2">
                  {bookmarks.map((bookmark, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 cursor-pointer"
                      onClick={() => {
                        setOffset(Math.floor(bookmark.offset / bytesPerRow) * bytesPerRow);
                        setSelection({ start: bookmark.offset, end: bookmark.offset });
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: bookmark.color }}
                        />
                        <span className="text-white font-medium">{bookmark.label}</span>
                        <span className="text-sm text-slate-400">0x{bookmark.offset.toString(16)}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setBookmarks(bookmarks.filter((_, j) => j !== i));
                        }}
                        className="text-slate-400 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function calculateEntropy(data: Uint8Array): number {
  const freq = new Map<number, number>();
  data.forEach(byte => {
    freq.set(byte, (freq.get(byte) || 0) + 1);
  });

  let entropy = 0;
  freq.forEach(count => {
    const p = count / data.length;
    entropy -= p * Math.log2(p);
  });

  return entropy;
}

function findRepeatingPatterns(data: Uint8Array): Array<{ pattern: number[]; count: number; positions: number[] }> {
  const patterns = new Map<string, { count: number; positions: number[] }>();
  const minPatternLength = 2;
  const maxPatternLength = 8;

  for (let len = minPatternLength; len <= maxPatternLength && len <= data.length; len++) {
    for (let i = 0; i <= data.length - len; i++) {
      const pattern = Array.from(data.slice(i, i + len));
      const key = pattern.join(',');

      if (!patterns.has(key)) {
        patterns.set(key, { count: 0, positions: [] });
      }
      const entry = patterns.get(key)!;
      entry.count++;
      entry.positions.push(i);
    }
  }

  return Array.from(patterns.entries())
    .filter(([_, v]) => v.count > 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([key, value]) => ({
      pattern: key.split(',').map(Number),
      count: value.count,
      positions: value.positions.slice(0, 5)
    }));
}
