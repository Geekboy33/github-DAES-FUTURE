import { useState, useRef } from 'react';
import { Upload, Download, FileText, Binary } from 'lucide-react';

interface DTC1BTransaction {
  offset: number;
  currency: string;
  amount: bigint;
  blockIndex: number;
  rawData: Uint8Array;
}

interface BinaryAnalysisResult {
  fileName: string;
  fileSize: number;
  fileHash: string;
  detectedFormat: {
    name: string;
    confidence: number;
    category: string;
    isDTC1B: boolean;
    isEncrypted: boolean;
  };
  dtc1bAnalysis: {
    isValidDTC1B: boolean;
    confidence: number;
    transactions: DTC1BTransaction[];
    blockStructure: boolean;
    totalTransactions: number;
  };
  encryptionAnalysis: {
    isEncrypted: boolean;
    algorithm?: string;
    confidence: number;
  };
  forensicAnalysis: {
    entropy: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    suspiciousPatterns: string[];
  };
  hexDump: string[];
  rawData: Uint8Array;
}

export function AdvancedBinaryReader() {
  const [analysis, setAnalysis] = useState<BinaryAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const generateFileHash = (data: Uint8Array): string => {
    let hash = 0;
    for (let i = 0; i < Math.min(data.length, 1024); i++) {
      hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
    }
    return hash.toString(16).padStart(8, '0').toUpperCase();
  };

  const findDTC1BTransactions = (data: Uint8Array): DTC1BTransaction[] => {
    const transactions: DTC1BTransaction[] = [];
    const currencies = ['USD', 'EUR', 'GBP'];
    
    currencies.forEach(currency => {
      const currencyBytes = new TextEncoder().encode(currency);
      for (let i = 0; i <= data.length - currencyBytes.length; i++) {
        let match = true;
        for (let j = 0; j < currencyBytes.length; j++) {
          if (data[i + j] !== currencyBytes[j]) {
            match = false;
            break;
          }
        }
        if (match && i + 8 < data.length) {
          const view = new DataView(data.buffer, i + 4, 4);
          const amount = BigInt(view.getUint32(0, true));
          transactions.push({
            offset: i,
            currency,
            amount,
            blockIndex: Math.floor(i / 128),
            rawData: data.slice(i, Math.min(i + 128, data.length))
          });
        }
      }
    });
    
    return transactions;
  };

  const generateHexDump = (data: Uint8Array, offset: number, length: number): string[] => {
    const lines: string[] = [];
    const end = Math.min(offset + length, data.length);
    
    for (let i = offset; i < end; i += 16) {
      const offsetStr = i.toString(16).padStart(8, '0').toUpperCase();
      const hexBytes = [];
      const asciiChars = [];
      
      for (let j = 0; j < 16 && i + j < end; j++) {
        const byte = data[i + j];
        hexBytes.push(byte.toString(16).padStart(2, '0').toUpperCase());
        asciiChars.push(byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.');
      }
      
      const hexStr = hexBytes.join(' ');
      const asciiStr = asciiChars.join('');
      lines.push(`${offsetStr}  ${hexStr.padEnd(48, ' ')}  ${asciiStr}`);
    }
    
    return lines;
  };

  const analyzeDTC1BFile = (data: Uint8Array, fileName: string): BinaryAnalysisResult => {
    const entropy = calculateEntropy(data);
    const transactions = findDTC1BTransactions(data);
    const fileHash = generateFileHash(data);
    const hexDump = generateHexDump(data, 0, Math.min(1024, data.length));
    
    const isEncrypted = entropy > 7.5;
    const isDTC1B = transactions.length > 0 || (data.length % 128 === 0);
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (entropy > 7.8) riskLevel = 'critical';
    else if (entropy > 7.0) riskLevel = 'high';
    else if (entropy > 6.0) riskLevel = 'medium';
    
    return {
      fileName,
      fileSize: data.length,
      fileHash,
      detectedFormat: {
        name: isDTC1B ? 'DTC1B Banking Format' : 'Binary File',
        confidence: isDTC1B ? 85 : 50,
        category: isDTC1B ? 'banking' : 'binary',
        isDTC1B,
        isEncrypted
      },
      dtc1bAnalysis: {
        isValidDTC1B: isDTC1B,
        confidence: isDTC1B ? 85 : 0,
        transactions,
        blockStructure: data.length % 128 === 0,
        totalTransactions: transactions.length
      },
      encryptionAnalysis: {
        isEncrypted,
        algorithm: isEncrypted ? 'AES-256-GCM (Probable)' : undefined,
        confidence: isEncrypted ? 80 : 20
      },
      forensicAnalysis: {
        entropy,
        riskLevel,
        suspiciousPatterns: isEncrypted ? ['Alta entropía detectada'] : []
      },
      hexDump,
      rawData: data
    };
  };

  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const result = analyzeDTC1BFile(data, file.name);
      setAnalysis(result);
    } catch (error) {
      console.error('Error analyzing file:', error);
      alert('Error al analizar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatCurrency = (amount: bigint, currency: string): string => {
    const value = Number(amount) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const exportToJSON = () => {
    if (!analysis) return;
    const json = JSON.stringify(analysis, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.fileName}_analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
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
              <h1 className="text-3xl font-bold text-white">Analizador Binario Universal</h1>
              <p className="text-sm text-slate-400">Detección automática de formatos DTC1B</p>
            </div>
          </div>
        </div>

        {!analysis ? (
          <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] p-12">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileLoad}
              className="hidden"
              id="advanced-file-input"
              accept="*"
              title="Seleccionar archivo"
              aria-label="Seleccionar archivo para análisis"
            />
            <label
              htmlFor="advanced-file-input"
              className="cursor-pointer flex flex-col items-center gap-4"
            >
              <div className="p-6 bg-blue-600 rounded-full">
                <Upload className="w-12 h-12 text-white" />
              </div>
              <div className="text-center">
                <p className="text-xl text-white font-semibold mb-2">
                  Cargar Archivo para Análisis
                </p>
                <p className="text-sm text-slate-400">
                  Soporta archivos DTC1B, binarios y encriptados
                </p>
              </div>
            </label>
            {loading && (
              <div className="mt-4 text-center text-blue-400">
                Analizando archivo...
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{analysis.fileName}</h2>
                  <p className="text-sm text-slate-400">
                    {formatBytes(analysis.fileSize)} • Hash: {analysis.fileHash}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={exportToJSON}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Exportar JSON
                  </button>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0d0d0d] rounded-lg p-4 border border-[#1a1a1a]">
                <p className="text-xs text-slate-400 mb-1">Estado DTC1B</p>
                <p className={`text-lg font-bold ${
                  analysis.dtc1bAnalysis.isValidDTC1B ? 'text-green-400' : 'text-red-400'
                }`}>
                  {analysis.dtc1bAnalysis.isValidDTC1B ? '✅ Válido' : '❌ No Detectado'}
                </p>
              </div>

              <div className="bg-[#0d0d0d] rounded-lg p-4 border border-[#1a1a1a]">
                <p className="text-xs text-slate-400 mb-1">Transacciones</p>
                <p className="text-2xl font-bold text-green-400">
                  {analysis.dtc1bAnalysis.totalTransactions}
                </p>
              </div>

              <div className="bg-[#0d0d0d] rounded-lg p-4 border border-[#1a1a1a]">
                <p className="text-xs text-slate-400 mb-1">Entropía</p>
                <p className="text-2xl font-bold text-purple-400">
                  {analysis.forensicAnalysis.entropy.toFixed(2)}
                </p>
              </div>

              <div className="bg-[#0d0d0d] rounded-lg p-4 border border-[#1a1a1a]">
                <p className="text-xs text-slate-400 mb-1">Encriptación</p>
                <p className={`text-lg font-bold ${
                  analysis.encryptionAnalysis.isEncrypted ? 'text-red-400' : 'text-green-400'
                }`}>
                  {analysis.encryptionAnalysis.isEncrypted ? '🔒 Sí' : '🔓 No'}
                </p>
              </div>
            </div>

            {analysis.dtc1bAnalysis.transactions.length > 0 && (
              <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-400" />
                  Transacciones DTC1B ({analysis.dtc1bAnalysis.totalTransactions})
                </h3>
                <div className="space-y-4">
                  {analysis.dtc1bAnalysis.transactions.map((tx, i) => (
                    <div key={i} className="p-4 bg-black rounded-lg border border-[#1a1a1a]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">Transacción #{i + 1}</p>
                          <p className="text-xs text-slate-400">
                            Offset: 0x{tx.offset.toString(16).toUpperCase()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-400">
                            {formatCurrency(tx.amount, tx.currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#0d0d0d] rounded-xl border border-[#1a1a1a] p-6">
              <h3 className="text-xl font-bold text-white mb-4">Vista Hexadecimal</h3>
              <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-green-400 overflow-x-auto max-h-96 overflow-y-auto">
                {analysis.hexDump.map((line, i) => (
                  <div key={i} className="mb-1">{line}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
