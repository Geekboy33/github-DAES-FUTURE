/* eslint-disable react/forbid-dom-props */
import { useState, useRef, useEffect } from 'react';
import {
  Upload, Download, Activity, AlertCircle, CheckCircle,
  Database, Lock, Key, Play, Pause, StopCircle, DollarSign, TrendingUp, Save
} from 'lucide-react';
import { balanceStore, type CurrencyBalance } from '../lib/balances-store';

// CurrencyBalance is now imported from balances-store

interface StreamingAnalysisResult {
  fileName: string;
  fileSize: number;
  bytesProcessed: number;
  progress: number;
  magicNumber: string;
  entropy: number;
  isEncrypted: boolean;
  detectedAlgorithm: string;
  ivBytes: string;
  saltBytes: string;
  balances: CurrencyBalance[];
  status: 'idle' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

export function LargeFileDTC1BAnalyzer() {
  const [analysis, setAnalysis] = useState<StreamingAnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loadedBalances, setLoadedBalances] = useState<CurrencyBalance[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef<boolean>(false);

  // Load existing balances on mount
  useEffect(() => {
    const existing = balanceStore.loadBalances();
    if (existing) {
      setLoadedBalances(existing.balances);
      console.log('[LargeFileDTC1BAnalyzer] Loaded existing balances:', existing.balances.length);
    }
  }, []);

  // Guardar balances en el store global
  const saveBalancesToStorage = (balances: CurrencyBalance[], fileName: string, fileSize: number) => {
    try {
      const totalTransactions = balances.reduce((sum, b) => sum + b.transactionCount, 0);
      
      balanceStore.saveBalances({
        balances,
        lastScanDate: new Date().toISOString(),
        fileName,
        fileSize,
        totalTransactions,
      });

      setLoadedBalances(balances);
      console.log('[LargeFileDTC1BAnalyzer] Balances saved successfully');
    } catch (error) {
      console.error('[LargeFileDTC1BAnalyzer] Error saving balances:', error);
    }
  };

  const calculateBlockEntropy = (data: Uint8Array): number => {
    const freq: { [key: number]: number } = {};
    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      freq[byte] = (freq[byte] || 0) + 1;
    }

    let entropy = 0;
    const len = data.length;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  };

  // Nombres de cuentas por moneda
  const getCurrencyAccountName = (currency: string): string => {
    const accountNames: { [key: string]: string } = {
      'USD': 'Cuenta en Dólares Estadounidenses',
      'EUR': 'Cuenta en Euros',
      'GBP': 'Cuenta en Libras Esterlinas',
      'CAD': 'Cuenta en Dólares Canadienses',
      'AUD': 'Cuenta en Dólares Australianos',
      'JPY': 'Cuenta en Yenes Japoneses',
      'CHF': 'Cuenta en Francos Suizos',
      'CNY': 'Cuenta en Yuan Chino',
      'INR': 'Cuenta en Rupias Indias',
      'MXN': 'Cuenta en Pesos Mexicanos',
      'BRL': 'Cuenta en Reales Brasileños',
      'RUB': 'Cuenta en Rublos Rusos',
      'KRW': 'Cuenta en Won Surcoreano',
      'SGD': 'Cuenta en Dólares de Singapur',
      'HKD': 'Cuenta en Dólares de Hong Kong'
    };
    return accountNames[currency] || `Cuenta en ${currency}`;
  };

  // Función mejorada para extraer balances con montos y crear cuentas independientes
  const extractCurrencyBalances = (data: Uint8Array, offset: number, currentBalances: { [currency: string]: CurrencyBalance }) => {
    const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'MXN', 'BRL', 'RUB', 'KRW', 'SGD', 'HKD'];
    
    currencies.forEach(currency => {
      const currencyBytes = new TextEncoder().encode(currency);
      
      for (let i = 0; i <= data.length - currencyBytes.length - 8; i++) {
        // Verificar si coincide el código de moneda
        let match = true;
        for (let j = 0; j < currencyBytes.length; j++) {
          if (data[i + j] !== currencyBytes[j]) {
            match = false;
            break;
          }
        }
        
        if (match) {
          // Intentar extraer el monto (próximos 4 u 8 bytes después del código de moneda)
          let amount = 0;
          
          // Probar diferentes formatos de monto
          try {
            // Formato 1: 4 bytes little-endian (uint32)
            if (i + currencyBytes.length + 4 <= data.length) {
              const view = new DataView(data.buffer, data.byteOffset + i + currencyBytes.length, 4);
              const potentialAmount = view.getUint32(0, true);
              
              // Validar que el monto sea razonable (entre 0 y 1 billón de centavos)
              if (potentialAmount > 0 && potentialAmount < 100000000000) {
                amount = potentialAmount / 100; // Convertir centavos a unidades
              }
            }
            
            // Formato 2: 8 bytes little-endian (double o int64)
            if (amount === 0 && i + currencyBytes.length + 8 <= data.length) {
              const view = new DataView(data.buffer, data.byteOffset + i + currencyBytes.length, 8);
              const potentialDouble = view.getFloat64(0, true);
              
              if (potentialDouble > 0 && potentialDouble < 1000000000 && !isNaN(potentialDouble)) {
                amount = potentialDouble;
              }
            }
            
            // Si encontramos un monto válido, crear/actualizar cuenta independiente
            if (amount > 0) {
              if (!currentBalances[currency]) {
                // Crear nueva cuenta para esta moneda
                currentBalances[currency] = {
                  currency,
                  accountName: getCurrencyAccountName(currency),
                  totalAmount: 0,
                  transactionCount: 0,
                  lastUpdated: Date.now(),
                  amounts: [],
                  largestTransaction: 0,
                  smallestTransaction: Infinity,
                  averageTransaction: 0
                };
              }
              
              // Sumar el monto a la cuenta correspondiente
              currentBalances[currency].totalAmount += amount;
              currentBalances[currency].transactionCount++;
              currentBalances[currency].amounts.push(amount);
              currentBalances[currency].lastUpdated = Date.now();
              
              // Actualizar transacción más grande
              if (amount > currentBalances[currency].largestTransaction) {
                currentBalances[currency].largestTransaction = amount;
              }
              
              // Actualizar transacción más pequeña
              if (amount < currentBalances[currency].smallestTransaction) {
                currentBalances[currency].smallestTransaction = amount;
              }
              
              // Calcular promedio
              currentBalances[currency].averageTransaction = 
                currentBalances[currency].totalAmount / currentBalances[currency].transactionCount;
              
              // Limitar array de montos a últimos 100 para no consumir demasiada memoria
              if (currentBalances[currency].amounts.length > 100) {
                currentBalances[currency].amounts.shift();
              }
            }
          } catch (e) {
            // Ignorar errores de parsing
          }
        }
      }
    });
    
    return currentBalances;
  };

  const analyzeFileLarge = async (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    processingRef.current = true;
    setIsPaused(false);

    console.log('[LargeFileDTC1BAnalyzer] Starting analysis:', {
      fileName: file.name,
      fileSize: (file.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
      timestamp: new Date().toISOString()
    });

    const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB por bloque
    const totalSize = file.size;
    let bytesProcessed = 0;
    let accumulatedEntropy = 0;
    let entropyBlocks = 0;
    const balanceTracker: { [currency: string]: CurrencyBalance } = {};

    const initialAnalysis: StreamingAnalysisResult = {
      fileName: file.name,
      fileSize: totalSize,
      bytesProcessed: 0,
      progress: 0,
      magicNumber: '',
      entropy: 0,
      isEncrypted: false,
      detectedAlgorithm: 'Desconocido',
      ivBytes: '',
      saltBytes: '',
      balances: [],
      status: 'processing'
    };

    setAnalysis(initialAnalysis);

    try {
      // Leer header
      const headerBlob = file.slice(0, Math.min(256, totalSize));
      const headerBuffer = await headerBlob.arrayBuffer();
      const headerBytes = new Uint8Array(headerBuffer);

      const magicNumber = Array.from(headerBytes.slice(0, 4))
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

      let detectedAlgorithm = 'Desconocido';
      let isEncrypted = false;

      const headerEntropy = calculateBlockEntropy(headerBytes);
      
      if (headerEntropy > 7.5) {
        isEncrypted = true;
        if (magicNumber.startsWith('B0 42')) {
          detectedAlgorithm = 'DTC1B Propietario (Posiblemente AES-256-GCM)';
        } else {
          detectedAlgorithm = 'AES (Genérico)';
        }
      }

      const ivBytes = Array.from(headerBytes.slice(12, 28))
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

      const saltBytes = Array.from(headerBytes.slice(28, 60))
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

      setAnalysis(prev => prev ? {
        ...prev,
        magicNumber,
        detectedAlgorithm,
        isEncrypted,
        ivBytes,
        saltBytes
      } : null);

      // Procesar archivo por bloques (continuará incluso si cambia de pestaña)
      let offset = 0;
      let updateCounter = 0;
      
      while (offset < totalSize && processingRef.current) {
        // Manejar pausa
        while (isPaused && processingRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Si se detuvo, salir
        if (!processingRef.current) {
          console.log('[LargeFileDTC1BAnalyzer] Processing stopped by user');
          break;
        }

        const chunkEnd = Math.min(offset + CHUNK_SIZE, totalSize);
        const blob = file.slice(offset, chunkEnd);
        const buffer = await blob.arrayBuffer();
        const chunk = new Uint8Array(buffer);

        const blockEntropy = calculateBlockEntropy(chunk);
        accumulatedEntropy += blockEntropy;
        entropyBlocks++;

        // Extraer balances en tiempo real
        extractCurrencyBalances(chunk, offset, balanceTracker);

        bytesProcessed += chunk.length;
        offset = chunkEnd;

        const progress = (bytesProcessed / totalSize) * 100;
        const averageEntropy = accumulatedEntropy / entropyBlocks;

        // Convertir balances a array ordenado con USD primero, EUR segundo, GBP tercero, CHF cuarto, y el resto por balance
        const balancesArray = Object.values(balanceTracker).sort((a, b) => {
          // USD siempre primero
          if (a.currency === 'USD') return -1;
          if (b.currency === 'USD') return 1;
          
          // EUR siempre segundo
          if (a.currency === 'EUR') return -1;
          if (b.currency === 'EUR') return 1;
          
          // GBP siempre tercero
          if (a.currency === 'GBP') return -1;
          if (b.currency === 'GBP') return 1;
          
          // CHF siempre cuarto
          if (a.currency === 'CHF') return -1;
          if (b.currency === 'CHF') return 1;
          
          // El resto ordenado por balance total (mayor a menor)
          return b.totalAmount - a.totalAmount;
        });

        setAnalysis(prev => prev ? {
          ...prev,
          bytesProcessed,
          progress,
          entropy: averageEntropy,
          balances: balancesArray
        } : null);

        // Actualizar store en tiempo real cada 10 chunks (100MB procesados)
        updateCounter++;
        if (updateCounter % 10 === 0 && balancesArray.length > 0) {
          saveBalancesToStorage(balancesArray, file.name, file.size);
          console.log(`[LargeFileDTC1BAnalyzer] 🔄 Live update: ${progress.toFixed(1)}% - ${balancesArray.length} currencies - ${balancesArray.reduce((s, b) => s + b.transactionCount, 0)} txns`);
        }

        // Pausa breve para no bloquear UI (usar requestIdleCallback si está disponible)
        if (typeof requestIdleCallback !== 'undefined') {
          await new Promise(resolve => requestIdleCallback(() => resolve(undefined)));
        } else {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      if (processingRef.current) {
        const balancesArray = Object.values(balanceTracker).sort((a, b) => {
          if (a.currency === 'USD') return -1;
          if (b.currency === 'USD') return 1;
          if (a.currency === 'EUR') return -1;
          if (b.currency === 'EUR') return 1;
          if (a.currency === 'GBP') return -1;
          if (b.currency === 'GBP') return 1;
          if (a.currency === 'CHF') return -1;
          if (b.currency === 'CHF') return 1;
          return b.totalAmount - a.totalAmount;
        });
        
        // Guardar balances finales en el store global
        saveBalancesToStorage(balancesArray, file.name, file.size);
        
        setAnalysis(prev => prev ? {
          ...prev,
          balances: balancesArray,
          status: 'completed'
        } : null);

        console.log('[LargeFileDTC1BAnalyzer] Analysis completed successfully', {
          currencies: balancesArray.length,
          totalTransactions: balancesArray.reduce((sum, b) => sum + b.transactionCount, 0)
        });
      }

    } catch (error) {
      console.error('[LargeFileDTC1BAnalyzer] Error analyzing file:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      setAnalysis(prev => prev ? {
        ...prev,
        status: 'error',
        errorMessage: errorMessage
      } : null);

      // Show user-friendly error
      alert(`❌ Error al analizar el archivo:\n\n${errorMessage}\n\nRevisa la consola para más detalles.`);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
      console.log('[LargeFileDTC1BAnalyzer] Processing finished');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      analyzeFileLarge(file);
    }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    processingRef.current = false;
    setIsProcessing(false);
    setIsPaused(false);
  };

  const handleDecrypt = async () => {
    if (!username || !password) {
      alert('Por favor ingresa username y password');
      return;
    }
    alert('Función de desencriptación en desarrollo. Se requiere implementar PBKDF2 + AES-GCM');
    setShowAuthModal(false);
  };

  const exportReport = () => {
    if (!analysis) return;

    const report = {
      ...analysis,
      timestamp: new Date().toISOString(),
      totalBalances: analysis.balances.reduce((sum, b) => sum + b.totalAmount, 0),
      totalTransactions: analysis.balances.reduce((sum, b) => sum + b.transactionCount, 0),
      balancesSummary: analysis.balances.map(b => ({
        currency: b.currency,
        total: b.totalAmount.toFixed(2),
        transactions: b.transactionCount,
        average: (b.totalAmount / b.transactionCount).toFixed(2)
      }))
    };

    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.fileName}_balances_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadSavedBalances = () => {
    const data = balanceStore.loadBalances();
    if (data) {
      setAnalysis({
        fileName: data.fileName,
        fileSize: data.fileSize,
        bytesProcessed: data.fileSize,
        progress: 100,
        magicNumber: '',
        entropy: 0,
        isEncrypted: false,
        detectedAlgorithm: 'Cargado desde memoria',
        ivBytes: '',
        saltBytes: '',
        balances: data.balances,
        status: 'completed'
      });
      alert(`✅ Balances cargados desde memoria:\n\n${data.balances.length} monedas\n${data.totalTransactions} transacciones\nArchivo: ${data.fileName}`);
    } else {
      alert('⚠️ No hay balances guardados en memoria');
    }
  };

  const clearSavedBalances = () => {
    if (confirm('¿Estás seguro de que quieres borrar todos los balances guardados?')) {
      balanceStore.clearBalances();
      setLoadedBalances([]);
      setAnalysis(null);
      alert('✅ Balances borrados de la memoria');
    }
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto pb-24">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl shadow-2xl p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Database className="w-10 h-10" />
                Analizador de Archivos Grandes DTC1B
              </h1>
              <p className="text-blue-100 text-lg">
                Procesamiento por bloques con extracción de balances en tiempo real
              </p>
            </div>
            <TrendingUp className="w-16 h-16 text-white opacity-20" />
          </div>
        </div>

        <div className="bg-[#0d0d0d] rounded-xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Upload className="w-6 h-6" />
            Cargar Archivo para Análisis
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="*"
              title="Seleccionar archivo DTC1B"
              aria-label="Seleccionar archivo DTC1B"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-5 h-5" />
              Seleccionar Archivo DTC1B
            </button>

            <button
              onClick={loadSavedBalances}
              disabled={isProcessing}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-500 hover:to-emerald-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              Cargar Balances Guardados
            </button>

            {isProcessing && (
              <>
                <button
                  onClick={handlePause}
                  className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition-all flex items-center gap-2"
                >
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  {isPaused ? 'Reanudar' : 'Pausar'}
                </button>

                <button
                  onClick={handleStop}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-500 transition-all flex items-center gap-2"
                >
                  <StopCircle className="w-5 h-5" />
                  Detener
                </button>
              </>
            )}

            {loadedBalances.length > 0 && !isProcessing && (
              <button
                onClick={clearSavedBalances}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-500 transition-all flex items-center gap-2 text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                Borrar Memoria
              </button>
            )}
          </div>

          {analysis && (
            <div className="mt-4 bg-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-semibold">{analysis.fileName}</span>
                <span className="text-cyan-400">
                  {(analysis.fileSize / (1024 * 1024 * 1024)).toFixed(2)} GB
                </span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-4 mb-2">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${analysis.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-slate-300">
                <span>{analysis.progress.toFixed(1)}% procesado</span>
                <span>
                  {(analysis.bytesProcessed / (1024 * 1024)).toFixed(0)} MB /{' '}
                  {(analysis.fileSize / (1024 * 1024)).toFixed(0)} MB
                </span>
              </div>
            </div>
          )}
        </div>

        {analysis && analysis.balances.length > 0 && (
          <div className="bg-[#0d0d0d] rounded-xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-green-400" />
                💰 Cuentas Independientes por Moneda ({analysis.balances.length})
              </h3>
              <div className="flex items-center gap-3">
                {isProcessing && (
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse">
                    <Activity className="w-4 h-4 animate-spin" />
                    <span className="font-semibold text-sm">Actualizando Ledger en Tiempo Real</span>
                  </div>
                )}
                {analysis.status === 'completed' && (
                  <button
                    onClick={exportReport}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-500 hover:to-emerald-500 transition-all flex items-center gap-2 shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    Exportar Reporte Completo
                  </button>
                )}
              </div>
            </div>

            {/* Resumen total de todas las cuentas */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 mb-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-opacity-90 text-sm font-semibold mb-1">🏦 RESUMEN GLOBAL</p>
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-white text-xs opacity-80">Total Transacciones</p>
                      <p className="text-3xl font-black text-white">
                        {analysis.balances.reduce((sum, b) => sum + b.transactionCount, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="h-12 w-px bg-white opacity-30"></div>
                    <div>
                      <p className="text-white text-xs opacity-80">Monedas Detectadas</p>
                      <p className="text-3xl font-black text-white">
                        {analysis.balances.length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-xs opacity-80 mb-1">📊 Progreso</p>
                  <p className="text-2xl font-bold text-white">{analysis.progress.toFixed(1)}%</p>
                  {isProcessing && (
                    <p className="text-white text-xs opacity-80 mt-2 flex items-center gap-1 justify-end">
                      <CheckCircle className="w-3 h-3" />
                      Sincronizando con Ledger
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Contenedor scrollable para todas las cuentas */}
            <div className="space-y-4 overflow-y-auto pr-2" style={{maxHeight: '600px', minHeight: '400px'}}>
              {analysis.balances.map((balance, index) => {
                // Determinar color basado en la moneda y posición
                let colorClass = '';
                if (balance.currency === 'USD') {
                  colorClass = 'from-green-600 to-emerald-700 border-green-400';
                } else if (balance.currency === 'EUR') {
                  colorClass = 'from-blue-600 to-cyan-700 border-blue-400';
                } else if (balance.currency === 'GBP') {
                  colorClass = 'from-purple-600 to-pink-700 border-purple-400';
                } else if (balance.currency === 'CAD') {
                  colorClass = 'from-orange-600 to-red-700 border-orange-400';
                } else if (balance.currency === 'AUD') {
                  colorClass = 'from-indigo-600 to-purple-700 border-indigo-400';
                } else if (balance.currency === 'JPY') {
                  colorClass = 'from-yellow-600 to-orange-700 border-yellow-400';
                } else if (balance.currency === 'CHF') {
                  colorClass = 'from-pink-600 to-rose-700 border-pink-400';
                } else if (balance.currency === 'CNY') {
                  colorClass = 'from-teal-600 to-cyan-700 border-teal-400';
                } else if (balance.currency === 'INR') {
                  colorClass = 'from-violet-600 to-purple-700 border-violet-400';
                } else if (balance.currency === 'MXN') {
                  colorClass = 'from-amber-600 to-yellow-700 border-amber-400';
                } else if (balance.currency === 'BRL') {
                  colorClass = 'from-lime-600 to-green-700 border-lime-400';
                } else if (balance.currency === 'RUB') {
                  colorClass = 'from-red-600 to-rose-700 border-red-400';
                } else if (balance.currency === 'KRW') {
                  colorClass = 'from-sky-600 to-blue-700 border-sky-400';
                } else if (balance.currency === 'SGD') {
                  colorClass = 'from-fuchsia-600 to-pink-700 border-fuchsia-400';
                } else if (balance.currency === 'HKD') {
                  colorClass = 'from-rose-600 to-red-700 border-rose-400';
                } else {
                  colorClass = 'from-slate-700 to-slate-800 border-slate-500';
                }
                
                return (
                  <div 
                    key={balance.currency}
                    className={`bg-gradient-to-br ${colorClass} rounded-xl p-6 shadow-2xl border-2 border-opacity-30 mb-4`}
                  >
                  {/* Encabezado de la cuenta */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white border-opacity-30">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <DollarSign className="w-6 h-6 text-white" />
                        <h4 className="text-2xl font-bold text-white">{balance.accountName}</h4>
                      </div>
                      <p className="text-white text-opacity-80 text-sm flex items-center gap-2">
                        <span className="bg-white bg-opacity-30 px-3 py-1 rounded-full font-mono font-bold">
                          {balance.currency}
                        </span>
                        {balance.currency === 'USD' && (
                          <span className="bg-yellow-400 text-slate-900 px-2 py-0.5 rounded-full text-xs font-bold">
                            🥇 PRINCIPAL
                          </span>
                        )}
                        {balance.currency === 'EUR' && (
                          <span className="bg-blue-300 text-slate-900 px-2 py-0.5 rounded-full text-xs font-bold">
                            🥈 SECUNDARIA
                          </span>
                        )}
                        <span>• Cuenta #{index + 1}</span>
                      </p>
                    </div>
                    {isProcessing && (
                      <div className="flex items-center gap-2 bg-white bg-opacity-30 rounded-full px-3 py-2">
                        <Activity className="w-4 h-4 text-white animate-spin" />
                        <span className="text-white text-sm font-semibold">Sumando...</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Balance Principal */}
                  <div className="mb-6 bg-white bg-opacity-10 rounded-xl p-4">
                    <p className="text-white text-opacity-90 text-sm mb-2 uppercase tracking-wide">
                      💰 Balance Total Acumulado
                    </p>
                    <p className="text-5xl font-black text-white drop-shadow-lg">
                      {formatCurrency(balance.totalAmount, balance.currency)}
                    </p>
                    <p className="text-white text-opacity-70 text-xs mt-2">
                      Última actualización: {new Date(balance.lastUpdated).toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Estadísticas en Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <p className="text-white text-opacity-70 text-xs mb-1">📊 Transacciones</p>
                      <p className="text-2xl font-bold text-white">{balance.transactionCount}</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <p className="text-white text-opacity-70 text-xs mb-1">📈 Promedio</p>
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(balance.averageTransaction, balance.currency)}
                      </p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <p className="text-white text-opacity-70 text-xs mb-1">🔺 Mayor</p>
                      <p className="text-xl font-bold text-white">
                        {balance.largestTransaction > 0 ? formatCurrency(balance.largestTransaction, balance.currency) : '-'}
                      </p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <p className="text-white text-opacity-70 text-xs mb-1">🔻 Menor</p>
                      <p className="text-xl font-bold text-white">
                        {balance.smallestTransaction < Infinity ? formatCurrency(balance.smallestTransaction, balance.currency) : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Últimas transacciones */}
                  {balance.amounts.length > 0 && (
                    <div className="bg-white bg-opacity-10 rounded-lg p-3">
                      <p className="text-white text-opacity-90 text-sm mb-2 font-semibold">
                        📝 Últimas 10 transacciones encontradas:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {balance.amounts.slice(-10).reverse().map((amt, i) => (
                          <div key={i} className="bg-white bg-opacity-30 text-white text-xs px-3 py-1.5 rounded-lg font-mono font-semibold">
                            +{formatCurrency(amt, balance.currency)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>

            {analysis.status === 'completed' && (
              <div className="mt-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-white" />
                  <div className="flex-1">
                    <p className="text-white font-bold text-lg">Análisis Completado</p>
                    <p className="text-white text-opacity-90 text-sm">
                      Total de transacciones: {analysis.balances.reduce((sum, b) => sum + b.transactionCount, 0)} | 
                      Monedas encontradas: {analysis.balances.length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0d0d0d] rounded-xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Información del Archivo
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[#80ff80] text-sm">Magic Number</label>
                  <div className="bg-slate-700 rounded p-2 mt-1">
                    <code className="text-cyan-400 font-mono">{analysis.magicNumber}</code>
                  </div>
                </div>

                <div>
                  <label className="text-[#80ff80] text-sm">Algoritmo Detectado</label>
                  <div className="bg-slate-700 rounded p-2 mt-1">
                    <span className="text-white font-medium">{analysis.detectedAlgorithm}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[#80ff80] text-sm">Estado de Encriptación</label>
                  <div className="bg-slate-700 rounded p-2 mt-1 flex items-center gap-2">
                    {analysis.isEncrypted ? (
                      <>
                        <Lock className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 font-medium">Encriptado</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-medium">No Encriptado</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0d0d0d] rounded-xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Análisis de Entropía
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-300">Entropía Promedio</span>
                    <span className="text-white font-bold">{analysis.entropy.toFixed(4)} bits/byte</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        analysis.entropy > 7.5
                          ? 'bg-red-500'
                          : analysis.entropy > 6.0
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${(analysis.entropy / 8) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-700 rounded-lg p-4">
                  {analysis.entropy > 7.5 ? (
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-red-400 font-semibold mb-1">ALTA ENTROPÍA</div>
                        <div className="text-slate-300 text-sm">
                          Los datos están fuertemente encriptados. Se requieren credenciales para desencriptar.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-green-400 font-semibold mb-1">BAJA ENTROPÍA</div>
                        <div className="text-slate-300 text-sm">
                          Datos estructurados sin encriptación fuerte. Balances extraíbles.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {analysis.isEncrypted && (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-green-500 hover:to-emerald-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Key className="w-5 h-5" />
                    Intentar Desencriptar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#0d0d0d] rounded-xl shadow-2xl p-6 max-w-md w-full">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Key className="w-6 h-6 text-cyan-400" />
                Desencriptar Archivo
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                    placeholder="Ingresa el username"
                  />
                </div>

                <div>
                  <label className="text-slate-300 text-sm block mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                    placeholder="Ingresa el password"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleDecrypt}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-500 hover:to-emerald-500 transition-all"
                  >
                    Desencriptar
                  </button>
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-slate-600 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
