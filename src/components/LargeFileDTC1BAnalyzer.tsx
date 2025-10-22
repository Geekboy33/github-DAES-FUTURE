// Large File DTC1B Analyzer Component - Fixed Version
import { useState, useRef, useEffect } from 'react';
import {
  Upload, Download, Activity, AlertCircle, CheckCircle,
  Database, Lock, Key, Play, Pause, StopCircle, DollarSign, TrendingUp, Save, RotateCcw
} from 'lucide-react';
import { balanceStore, type CurrencyBalance } from '../lib/balances-store';
import { processingStore } from '../lib/processing-store';

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
  // Component state
  const [analysis, setAnalysis] = useState<StreamingAnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loadedBalances, setLoadedBalances] = useState<CurrencyBalance[]>([]);
  const [hasPendingProcess, setHasPendingProcess] = useState(false);
  const [pendingProcessInfo, setPendingProcessInfo] = useState<{ fileName: string; progress: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef<boolean>(false);
  const currentFileRef = useRef<File | null>(null);
  const analysisRef = useRef<StreamingAnalysisResult | null>(null);

  // Mantener analysisRef actualizado
  useEffect(() => {
    analysisRef.current = analysis;
  }, [analysis]);

  // Load existing balances and check for pending processes on mount
  useEffect(() => {
    const existing = balanceStore.loadBalances();
    if (existing) {
      setLoadedBalances(existing.balances);
      console.log('[LargeFileDTC1BAnalyzer] Loaded existing balances:', existing.balances.length);
    }

    // Verificar si hay un proceso pendiente
    const pendingState = processingStore.loadState();
    if (pendingState && (pendingState.status === 'processing' || pendingState.status === 'paused')) {
      setHasPendingProcess(true);
      setPendingProcessInfo({
        fileName: pendingState.fileName,
        progress: pendingState.progress
      });
      console.log('[LargeFileDTC1BAnalyzer] Proceso pendiente detectado:', pendingState.fileName, pendingState.progress + '%');
      
      // Si hay balances en el estado pendiente, cargarlos automáticamente
      if (pendingState.balances && pendingState.balances.length > 0) {
        setAnalysis({
          fileName: pendingState.fileName,
          fileSize: pendingState.fileSize,
          bytesProcessed: pendingState.bytesProcessed,
          progress: pendingState.progress,
          magicNumber: '',
          entropy: 0,
          isEncrypted: false,
          detectedAlgorithm: 'Recuperado desde estado guardado',
          ivBytes: '',
          saltBytes: '',
          balances: pendingState.balances,
          status: 'idle'
        });
        setLoadedBalances(pendingState.balances);
      }
    }

    // Auto-guardado al cerrar o salir de la página
    const handleBeforeUnload = () => {
      const currentAnalysis = analysisRef.current;
      if (currentAnalysis && currentAnalysis.balances.length > 0) {
        saveBalancesToStorage(currentAnalysis.balances, currentAnalysis.fileName, currentAnalysis.fileSize);
        console.log('[LargeFileDTC1BAnalyzer] Auto-guardado al cerrar aplicación');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Guardar al desmontar el componente
      const currentAnalysis = analysisRef.current;
      if (currentAnalysis && currentAnalysis.balances.length > 0) {
        saveBalancesToStorage(currentAnalysis.balances, currentAnalysis.fileName, currentAnalysis.fileSize);
      }
    };
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

  // NOTA: Funciones movidas a processing-store.ts
  // const calculateBlockEntropy = (data: Uint8Array): number => {
  //   const freq: { [key: number]: number } = {};
  //   for (let i = 0; i < data.length; i++) {
  //     const byte = data[i];
  //     freq[byte] = (freq[byte] || 0) + 1;
  //   }

  //   let entropy = 0;
  //   const len = data.length;
  //   for (const count of Object.values(freq)) {
  //     const p = count / len;
  //     entropy -= p * Math.log2(p);
  //   }

  //   return entropy;
  // };

  // Nombres de cuentas por moneda
  // const getCurrencyAccountName = (currency: string): string => {
  //   const accountNames: { [key: string]: string } = {
  //     'USD': 'Cuenta en Dólares Estadounidenses',
  //     'EUR': 'Cuenta en Euros',
  //     'GBP': 'Cuenta en Libras Esterlinas',
  //     'CAD': 'Cuenta en Dólares Canadienses',
  //     'AUD': 'Cuenta en Dólares Australianos',
  //     'JPY': 'Cuenta en Yenes Japoneses',
  //     'CHF': 'Cuenta en Francos Suizos',
  //     'CNY': 'Cuenta en Yuan Chino',
  //     'INR': 'Cuenta en Rupias Indias',
  //     'MXN': 'Cuenta en Pesos Mexicanos',
  //     'BRL': 'Cuenta en Reales Brasileños',
  //     'RUB': 'Cuenta en Rublos Rusos',
  //     'KRW': 'Cuenta en Won Surcoreano',
  //     'SGD': 'Cuenta en Dólares de Singapur',
  //     'HKD': 'Cuenta en Dólares de Hong Kong'
  //   };
  //   return accountNames[currency] || `Cuenta en ${currency}`;
  // };

  // NOTA: Función movida a processing-store.ts
  // const extractCurrencyBalances = (data: Uint8Array, _offset: number, currentBalances: { [currency: string]: CurrencyBalance }) => {
  //   ... código completo movido a processing-store.ts ...
  // };

  // NOTA: Esta función fue reemplazada por processingStore.startGlobalProcessing()
  // Toda la lógica de procesamiento ahora está en processing-store.ts

  // Función para reanudar un procesamiento pendiente
  const resumePendingProcess = async () => {
    try {
      const pendingState = processingStore.loadState();
      if (!pendingState) {
        alert('⚠️ No se encontró un proceso pendiente');
        return;
      }

      // Intentar cargar el archivo desde IndexedDB
      const fileData = await processingStore.loadFileDataFromIndexedDB();
      
      if (!fileData) {
        alert('❌ No se pudo recuperar el archivo. Por favor, carga el archivo nuevamente.');
        setHasPendingProcess(false);
        setPendingProcessInfo(null);
        processingStore.clearState();
        return;
      }

      // Crear File desde ArrayBuffer
      const file = new File([fileData], pendingState.fileName, { type: 'application/octet-stream' });
      
      // Reanudar desde donde se quedó usando procesamiento global
      setHasPendingProcess(false);
      setPendingProcessInfo(null);
      setIsProcessing(true);
      processingRef.current = true;
      currentFileRef.current = file;

      await processingStore.startGlobalProcessing(file, pendingState.bytesProcessed, (progress, balances) => {
        // Callback de progreso
        setAnalysis(prev => prev ? {
          ...prev,
          progress,
          bytesProcessed: (file.size * progress) / 100,
          balances,
          status: 'processing'
        } : {
          fileName: file.name,
          fileSize: file.size,
          bytesProcessed: (file.size * progress) / 100,
          progress,
          magicNumber: '',
          entropy: 0,
          isEncrypted: false,
          detectedAlgorithm: 'Procesando...',
          ivBytes: '',
          saltBytes: '',
          balances,
          status: 'processing'
        });

        // Guardar balances periódicamente
        if (balances.length > 0 && Math.floor(progress) % 10 === 0) {
          saveBalancesToStorage(balances, file.name, file.size);
        }
      });

      setIsProcessing(false);
      processingRef.current = false;
      
    } catch (error) {
      console.error('[LargeFileDTC1BAnalyzer] Error resuming process:', error);
      alert(`❌ Error al reanudar el proceso:\n\n${error instanceof Error ? error.message : 'Error desconocido'}`);
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  // Función para cancelar un proceso pendiente
  const cancelPendingProcess = () => {
    if (confirm('¿Estás seguro de que quieres cancelar el proceso pendiente?')) {
      processingStore.clearState();
      processingStore.clearIndexedDB();
      setHasPendingProcess(false);
      setPendingProcessInfo(null);
      console.log('[LargeFileDTC1BAnalyzer] Pending process cancelled');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      processingRef.current = true;
      currentFileRef.current = file;

      // Usar procesamiento global en lugar de local
      try {
        await processingStore.startGlobalProcessing(file, 0, (progress, balances) => {
          // Callback de progreso para actualizar UI local
          setAnalysis(prev => prev ? {
            ...prev,
            progress,
            bytesProcessed: (file.size * progress) / 100,
            balances,
            status: 'processing'
          } : {
            fileName: file.name,
            fileSize: file.size,
            bytesProcessed: (file.size * progress) / 100,
            progress,
            magicNumber: '',
            entropy: 0,
            isEncrypted: false,
            detectedAlgorithm: 'Procesando...',
            ivBytes: '',
            saltBytes: '',
            balances,
            status: 'processing'
          });

          // Guardar balances periódicamente
          if (balances.length > 0 && Math.floor(progress) % 10 === 0) {
            saveBalancesToStorage(balances, file.name, file.size);
          }
        });

        setIsProcessing(false);
        processingRef.current = false;
      } catch (error) {
        console.error('[LargeFileDTC1BAnalyzer] Error:', error);
        setIsProcessing(false);
        processingRef.current = false;
        setError('Error al procesar el archivo');
      }
    }
  };

  const handlePause = () => {
    if (isPaused) {
      // Reanudar
      processingStore.resumeProcessing();
      setIsPaused(false);
    } else {
      // Pausar
      processingStore.pauseProcessing();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    processingStore.stopProcessing();
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
    <div className="min-h-screen bg-black p-3 sm:p-6">
      <div className="max-w-7xl mx-auto pb-20 sm:pb-24">
        {/* Header con tema consistente */}
        <div className="bg-gradient-to-r from-[#0a0a0a] to-[#0d0d0d] rounded-xl shadow-[0_0_30px_rgba(0,255,136,0.2)] p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 border border-[#00ff88]/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#e0ffe0] mb-2 flex items-center gap-2 sm:gap-3">
                <Database className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-[#00ff88]" />
                <span className="text-cyber">Analizador de Archivos Grandes DTC1B</span>
              </h1>
              <p className="text-[#80ff80] text-sm sm:text-base lg:text-lg">
                Procesamiento por bloques • Extracción en tiempo real • Persistencia automática
              </p>
            </div>
            <TrendingUp className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-[#00ff88] opacity-20 hidden sm:block" />
          </div>
        </div>

        {/* Panel de controles */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl shadow-[0_0_20px_rgba(0,255,136,0.1)] p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-[#e0ffe0] mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-[#00ff88]" />
            <span className="text-cyber">Cargar Archivo para Análisis</span>
          </h2>

          {/* Alerta de proceso pendiente CON BOTÓN PROMINENTE */}
          {hasPendingProcess && pendingProcessInfo && (
            <div className="mb-4 bg-gradient-to-r from-[#ff8c00]/30 to-[#ffa500]/30 border-2 border-[#ff8c00]/50 rounded-xl p-4 sm:p-6 shadow-[0_0_25px_rgba(255,140,0,0.4)] animate-pulse">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-[#ffa500] rounded-full p-2">
                    <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-black flex-shrink-0" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[#ffa500] font-black text-lg sm:text-xl mb-2">
                      ⚡ PROCESO INTERRUMPIDO - LISTO PARA CONTINUAR
                    </p>
                    <p className="text-[#e0ffe0] text-sm sm:text-base mb-1">
                      <strong>Archivo:</strong> {pendingProcessInfo.fileName}
                    </p>
                    <p className="text-[#00ff88] text-base sm:text-lg font-bold">
                      📊 Progreso guardado: {pendingProcessInfo.progress.toFixed(2)}%
                    </p>
                  </div>
                </div>
                
                {/* Botón GRANDE de reanudación */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={resumePendingProcess}
                    className="flex-1 bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00cc6a] hover:to-[#00aa55] text-black px-6 py-4 rounded-xl font-black text-base sm:text-lg transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,255,136,0.5)] hover:shadow-[0_0_30px_rgba(0,255,136,0.7)] transform hover:scale-105"
                  >
                    <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7 animate-spin" />
                    CONTINUAR DESDE {pendingProcessInfo.progress.toFixed(0)}%
                  </button>
                  <button
                    onClick={cancelPendingProcess}
                    className="sm:flex-none bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#ff6b6b] border-2 border-[#ff6b6b]/50 px-4 py-3 rounded-lg font-semibold transition-all text-sm"
                  >
                    Cancelar Proceso
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de error si existe */}
          {error && (
            <div className="mb-4 bg-[#ff6b6b]/20 border border-[#ff6b6b]/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#ff6b6b] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[#ff6b6b] font-bold mb-1">Error</p>
                  <p className="text-[#ffb3b3] text-sm">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-[#ff6b6b] hover:text-[#ff4444] transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
              className="bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00cc6a] hover:to-[#00aa55] text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,255,136,0.3)] text-sm sm:text-base"
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              Seleccionar Archivo DTC1B
            </button>

            <button
              onClick={loadSavedBalances}
              disabled={isProcessing}
              className="bg-[#0a0a0a] border border-[#00ff88]/30 hover:border-[#00ff88] text-[#00ff88] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(0,255,136,0.1)] hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] text-sm sm:text-base"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              Cargar Balances Guardados
            </button>

            {isProcessing && (
              <>
                <button
                  onClick={handlePause}
                  className="bg-[#1a1a1a] border border-[#ffa500]/30 hover:border-[#ffa500] text-[#ffa500] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {isPaused ? <Play className="w-4 h-4 sm:w-5 sm:h-5" /> : <Pause className="w-4 h-4 sm:w-5 sm:h-5" />}
                  {isPaused ? 'Reanudar' : 'Pausar'}
                </button>

                <button
                  onClick={handleStop}
                  className="bg-[#1a1a1a] border border-[#ff6b6b]/30 hover:border-[#ff6b6b] text-[#ff6b6b] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <StopCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  Detener
                </button>
              </>
            )}

            {loadedBalances.length > 0 && !isProcessing && (
              <button
                onClick={clearSavedBalances}
                className="bg-[#1a1a1a] border border-[#ff6b6b]/30 hover:border-[#ff6b6b] text-[#ff6b6b] px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                Borrar Memoria
              </button>
            )}
          </div>

          {/* Barra de progreso */}
          {analysis && (
            <div className="mt-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-1 sm:gap-0">
                <span className="text-[#e0ffe0] font-semibold text-sm sm:text-base truncate max-w-full sm:max-w-md">{analysis.fileName}</span>
                <span className="text-[#00ff88] font-mono text-xs sm:text-sm">
                  {(analysis.fileSize / (1024 * 1024 * 1024)).toFixed(2)} GB
                </span>
              </div>
              <div className="w-full bg-[#1a1a1a] rounded-full h-3 sm:h-4 mb-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#00ff88] to-[#00cc6a] h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,136,0.5)]"
                  style={{ width: `${analysis.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs sm:text-sm text-[#80ff80]">
                <span className="font-semibold">{analysis.progress.toFixed(1)}% procesado</span>
                <span className="font-mono">
                  {(analysis.bytesProcessed / (1024 * 1024)).toFixed(0)} MB /{' '}
                  {(analysis.fileSize / (1024 * 1024)).toFixed(0)} MB
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sección de balances */}
        {analysis && analysis.balances.length > 0 && (
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl shadow-[0_0_20px_rgba(0,255,136,0.1)] p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <h3 className="text-xl sm:text-2xl font-bold text-[#e0ffe0] flex items-center gap-2">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-[#00ff88]" />
                <span className="text-cyber">Cuentas por Moneda ({analysis.balances.length})</span>
              </h3>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {isProcessing && (
                  <div className="bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse text-xs sm:text-sm">
                    <Activity className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                    <span className="font-semibold">Actualizando en Tiempo Real</span>
                  </div>
                )}
                {analysis.status === 'completed' && (
                  <button
                    onClick={exportReport}
                    className="flex-1 sm:flex-none bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00cc6a] hover:to-[#00aa55] text-black px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,136,0.3)] text-xs sm:text-sm"
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    Exportar Reporte
                  </button>
                )}
              </div>
            </div>

            {/* Resumen total */}
            <div className="bg-gradient-to-r from-[#00ff88]/10 to-[#00cc6a]/10 border border-[#00ff88]/20 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 shadow-[0_0_15px_rgba(0,255,136,0.15)]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[#00ff88] text-xs sm:text-sm font-semibold mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    RESUMEN GLOBAL
                  </p>
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div>
                      <p className="text-[#80ff80] text-xs mb-1">Total Transacciones</p>
                      <p className="text-2xl sm:text-3xl font-black text-[#e0ffe0]">
                        {analysis.balances.reduce((sum, b) => sum + b.transactionCount, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="h-10 sm:h-12 w-px bg-[#00ff88] opacity-30"></div>
                    <div>
                      <p className="text-[#80ff80] text-xs mb-1">Monedas Detectadas</p>
                      <p className="text-2xl sm:text-3xl font-black text-[#e0ffe0]">
                        {analysis.balances.length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[#80ff80] text-xs mb-1">📊 Progreso</p>
                  <p className="text-xl sm:text-2xl font-bold text-[#00ff88]">{analysis.progress.toFixed(1)}%</p>
                  {isProcessing && (
                    <p className="text-[#80ff80] text-xs mt-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Sincronizando
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Contenedor scrollable para todas las cuentas */}
            <div className="space-y-3 sm:space-y-4 overflow-y-auto pr-1 sm:pr-2" style={{maxHeight: '600px', minHeight: '300px'}}>
              {analysis.balances.map((balance, index) => {
                // Tema homogéneo con variaciones sutiles de verde para cada moneda
                const isUSD = balance.currency === 'USD';
                const isEUR = balance.currency === 'EUR';
                
                return (
                  <div 
                    key={balance.currency}
                    className={`bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d] border ${
                      isUSD ? 'border-[#00ff88]/50' : isEUR ? 'border-[#00cc6a]/40' : 'border-[#00ff88]/20'
                    } rounded-xl p-4 sm:p-6 shadow-[0_0_15px_rgba(0,255,136,0.1)] mb-3 sm:mb-4 hover:shadow-[0_0_25px_rgba(0,255,136,0.2)] transition-all`}
                  >
                  {/* Encabezado de la cuenta */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 pb-3 border-b border-[#00ff88]/20">
                    <div className="flex-1 mb-2 sm:mb-0">
                      <div className="flex items-center gap-2 sm:gap-3 mb-1">
                        <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-[#00ff88]" />
                        <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#e0ffe0]">{balance.accountName}</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        <span className="bg-[#00ff88]/20 border border-[#00ff88]/30 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-mono font-bold text-[#00ff88]">
                          {balance.currency}
                        </span>
                        {isUSD && (
                          <span className="bg-[#00ff88] text-black px-2 py-0.5 rounded-full text-xs font-bold">
                            🥇 PRINCIPAL
                          </span>
                        )}
                        {isEUR && (
                          <span className="bg-[#00cc6a] text-black px-2 py-0.5 rounded-full text-xs font-bold">
                            🥈 SECUNDARIA
                          </span>
                        )}
                        <span className="text-[#80ff80]">• Cuenta #{index + 1}</span>
                      </div>
                    </div>
                    {isProcessing && (
                      <div className="flex items-center gap-2 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-full px-3 py-1.5">
                        <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-[#00ff88] animate-spin" />
                        <span className="text-[#00ff88] text-xs sm:text-sm font-semibold">Sumando...</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Balance Principal */}
                  <div className="mb-4 sm:mb-6 bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-xl p-3 sm:p-4">
                    <p className="text-[#80ff80] text-xs sm:text-sm mb-2 uppercase tracking-wide font-semibold">
                      💰 Balance Total Acumulado
                    </p>
                    <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#e0ffe0] drop-shadow-[0_0_10px_rgba(0,255,136,0.5)]">
                      {formatCurrency(balance.totalAmount, balance.currency)}
                    </p>
                    <p className="text-[#4d7c4d] text-xs mt-2 font-mono">
                      Última actualización: {new Date(balance.lastUpdated).toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Estadísticas en Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="bg-[#00ff88]/5 border border-[#00ff88]/10 rounded-lg p-2 sm:p-3">
                      <p className="text-[#80ff80] text-xs mb-1">📊 Transacciones</p>
                      <p className="text-xl sm:text-2xl font-bold text-[#e0ffe0]">{balance.transactionCount}</p>
                    </div>
                    <div className="bg-[#00ff88]/5 border border-[#00ff88]/10 rounded-lg p-2 sm:p-3">
                      <p className="text-[#80ff80] text-xs mb-1">📈 Promedio</p>
                      <p className="text-base sm:text-lg lg:text-xl font-bold text-[#e0ffe0]">
                        {formatCurrency(balance.averageTransaction, balance.currency)}
                      </p>
                    </div>
                    <div className="bg-[#00ff88]/5 border border-[#00ff88]/10 rounded-lg p-2 sm:p-3">
                      <p className="text-[#80ff80] text-xs mb-1">🔺 Mayor</p>
                      <p className="text-base sm:text-lg lg:text-xl font-bold text-[#e0ffe0]">
                        {balance.largestTransaction > 0 ? formatCurrency(balance.largestTransaction, balance.currency) : '-'}
                      </p>
                    </div>
                    <div className="bg-[#00ff88]/5 border border-[#00ff88]/10 rounded-lg p-2 sm:p-3">
                      <p className="text-[#80ff80] text-xs mb-1">🔻 Menor</p>
                      <p className="text-base sm:text-lg lg:text-xl font-bold text-[#e0ffe0]">
                        {balance.smallestTransaction < Infinity ? formatCurrency(balance.smallestTransaction, balance.currency) : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Últimas transacciones */}
                  {balance.amounts.length > 0 && (
                    <div className="bg-[#00ff88]/5 border border-[#00ff88]/10 rounded-lg p-3">
                      <p className="text-[#80ff80] text-xs sm:text-sm mb-2 font-semibold">
                        📝 Últimas 10 transacciones:
                      </p>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {balance.amounts.slice(-10).reverse().map((amt, i) => (
                          <div key={i} className="bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#e0ffe0] text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-mono font-semibold">
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

            {/* Mensaje de completado */}
            {analysis.status === 'completed' && (
              <div className="mt-4 sm:mt-6 bg-gradient-to-r from-[#00ff88]/20 to-[#00cc6a]/20 border border-[#00ff88]/30 rounded-lg p-3 sm:p-4 shadow-[0_0_15px_rgba(0,255,136,0.2)]">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[#00ff88]" />
                  <div className="flex-1">
                    <p className="text-[#e0ffe0] font-bold text-base sm:text-lg">✓ Análisis Completado Exitosamente</p>
                    <p className="text-[#80ff80] text-xs sm:text-sm mt-1">
                      Total de transacciones: <span className="font-bold">{analysis.balances.reduce((sum, b) => sum + b.transactionCount, 0).toLocaleString()}</span> | 
                      Monedas: <span className="font-bold">{analysis.balances.length}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Información del archivo y entropía */}
        {analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Información del archivo */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl shadow-[0_0_20px_rgba(0,255,136,0.1)] p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-[#e0ffe0] mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[#00ff88]" />
                <span className="text-cyber">Información del Archivo</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[#80ff80] text-xs sm:text-sm">Magic Number</label>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-2 mt-1">
                    <code className="text-[#00ff88] font-mono text-xs sm:text-sm">{analysis.magicNumber}</code>
                  </div>
                </div>

                <div>
                  <label className="text-[#80ff80] text-xs sm:text-sm">Algoritmo Detectado</label>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-2 mt-1">
                    <span className="text-[#e0ffe0] font-medium text-xs sm:text-sm">{analysis.detectedAlgorithm}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[#80ff80] text-xs sm:text-sm">Estado de Encriptación</label>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-2 mt-1 flex items-center gap-2">
                    {analysis.isEncrypted ? (
                      <>
                        <Lock className="w-4 h-4 text-[#ff6b6b]" />
                        <span className="text-[#ff6b6b] font-medium text-xs sm:text-sm">Encriptado</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-[#00ff88]" />
                        <span className="text-[#00ff88] font-medium text-xs sm:text-sm">No Encriptado</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Análisis de entropía */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl shadow-[0_0_20px_rgba(0,255,136,0.1)] p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-[#e0ffe0] mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[#00ff88]" />
                <span className="text-cyber">Análisis de Entropía</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2 text-xs sm:text-sm">
                    <span className="text-[#80ff80]">Entropía Promedio</span>
                    <span className="text-[#e0ffe0] font-bold font-mono">{analysis.entropy.toFixed(4)} bits/byte</span>
                  </div>
                  <div className="w-full bg-[#1a1a1a] rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        analysis.entropy > 7.5
                          ? 'bg-gradient-to-r from-[#ff6b6b] to-[#ff4444] shadow-[0_0_10px_rgba(255,107,107,0.5)]'
                          : analysis.entropy > 6.0
                          ? 'bg-gradient-to-r from-[#ffa500] to-[#ff8c00] shadow-[0_0_10px_rgba(255,165,0,0.5)]'
                          : 'bg-gradient-to-r from-[#00ff88] to-[#00cc6a] shadow-[0_0_10px_rgba(0,255,136,0.5)]'
                      }`}
                      style={{ width: `${(analysis.entropy / 8) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 sm:p-4">
                  {analysis.entropy > 7.5 ? (
                    <div className="flex items-start gap-2 sm:gap-3">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff6b6b] flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[#ff6b6b] font-semibold mb-1 text-xs sm:text-sm">ALTA ENTROPÍA</div>
                        <div className="text-[#80ff80] text-xs sm:text-sm">
                          Los datos están fuertemente encriptados. Se requieren credenciales para desencriptar.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#00ff88] flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[#00ff88] font-semibold mb-1 text-xs sm:text-sm">BAJA ENTROPÍA</div>
                        <div className="text-[#80ff80] text-xs sm:text-sm">
                          Datos estructurados sin encriptación fuerte. Balances extraíbles.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {analysis.isEncrypted && (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00cc6a] hover:to-[#00aa55] text-black px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,136,0.3)] text-sm sm:text-base"
                  >
                    <Key className="w-4 h-4 sm:w-5 sm:h-5" />
                    Intentar Desencriptar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de autenticación */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-[#0d0d0d] border border-[#00ff88]/30 rounded-xl shadow-[0_0_30px_rgba(0,255,136,0.3)] p-4 sm:p-6 max-w-md w-full">
              <h3 className="text-xl sm:text-2xl font-bold text-[#e0ffe0] mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 sm:w-6 sm:h-6 text-[#00ff88]" />
                <span className="text-cyber">Desencriptar Archivo</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[#80ff80] text-xs sm:text-sm block mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] focus:border-[#00ff88] text-[#e0ffe0] px-3 sm:px-4 py-2 rounded-lg focus:ring-2 focus:ring-[#00ff88]/30 outline-none transition-all text-sm sm:text-base"
                    placeholder="Ingresa el username"
                  />
                </div>

                <div>
                  <label className="text-[#80ff80] text-xs sm:text-sm block mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] focus:border-[#00ff88] text-[#e0ffe0] px-3 sm:px-4 py-2 rounded-lg focus:ring-2 focus:ring-[#00ff88]/30 outline-none transition-all text-sm sm:text-base"
                    placeholder="Ingresa el password"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleDecrypt}
                    className="flex-1 bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00cc6a] hover:to-[#00aa55] text-black px-4 py-2 sm:py-2.5 rounded-lg font-semibold transition-all shadow-[0_0_15px_rgba(0,255,136,0.3)] text-sm sm:text-base"
                  >
                    Desencriptar
                  </button>
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="flex-1 bg-[#1a1a1a] border border-[#00ff88]/30 hover:border-[#00ff88] text-[#00ff88] px-4 py-2 sm:py-2.5 rounded-lg font-semibold transition-all text-sm sm:text-base"
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

