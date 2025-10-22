import { useState, useEffect } from 'react';
import { Activity, Pause, Play, X, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { processingStore, ProcessingState } from '../lib/processing-store';

export function GlobalProcessingIndicator() {
  const [processingState, setProcessingState] = useState<ProcessingState | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const unsubscribe = processingStore.subscribe((state) => {
      setProcessingState(state);
    });

    return unsubscribe;
  }, []);

  if (!processingState || processingState.status === 'idle') {
    return null;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = () => {
    switch (processingState.status) {
      case 'processing':
        return 'bg-blue-600';
      case 'paused':
        return 'bg-yellow-600';
      case 'completed':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (processingState.status) {
      case 'processing':
        return <Activity className="w-4 h-4 animate-pulse" />;
      case 'paused':
        return <Pause className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (processingState.status) {
      case 'processing':
        return 'Procesando';
      case 'paused':
        return 'Pausado';
      case 'completed':
        return 'Completado';
      case 'error':
        return 'Error';
      default:
        return 'Desconocido';
    }
  };

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div className={`${getStatusColor()} text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all`}>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-semibold">{processingState.progress.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <div className="bg-[#0d0d0d] border border-[#00ff88]/30 rounded-lg shadow-[0_0_20px_rgba(0,255,136,0.2)] overflow-hidden">
        {/* Header */}
        <div className={`${getStatusColor()} px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-white font-semibold text-sm">{getStatusText()}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="text-white hover:bg-white/20 rounded p-1 transition-colors"
              title="Minimizar"
            >
              <span className="text-xs">_</span>
            </button>
            {processingState.status === 'completed' && (
              <button
                onClick={() => processingStore.clearState()}
                className="text-white hover:bg-white/20 rounded p-1 transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Nombre del archivo */}
          <div>
            <div className="text-xs text-[#80ff80] mb-1">Archivo:</div>
            <div className="text-sm text-[#e0ffe0] font-mono truncate" title={processingState.fileName}>
              {processingState.fileName}
            </div>
          </div>

          {/* Barra de progreso */}
          <div>
            <div className="flex justify-between text-xs text-[#80ff80] mb-2">
              <span>Progreso</span>
              <span className="font-semibold">{processingState.progress.toFixed(2)}%</span>
            </div>
            <div className="w-full bg-[#0a0a0a] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  processingState.status === 'completed'
                    ? 'bg-green-500'
                    : processingState.status === 'error'
                    ? 'bg-red-500'
                    : 'bg-[#00ff88]'
                }`}
                style={{ width: `${processingState.progress}%` }}
              />
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-[#4d7c4d]">Procesado:</div>
              <div className="text-[#e0ffe0] font-semibold">
                {formatBytes(processingState.bytesProcessed)}
              </div>
            </div>
            <div>
              <div className="text-[#4d7c4d]">Total:</div>
              <div className="text-[#e0ffe0] font-semibold">
                {formatBytes(processingState.fileSize)}
              </div>
            </div>
            <div>
              <div className="text-[#4d7c4d]">Chunk:</div>
              <div className="text-[#e0ffe0] font-semibold">
                {processingState.chunkIndex} / {processingState.totalChunks}
              </div>
            </div>
            <div>
              <div className="text-[#4d7c4d]">Monedas:</div>
              <div className="text-[#00ff88] font-semibold">
                {processingState.balances.length}
              </div>
            </div>
          </div>

          {/* Tiempo */}
          <div className="text-xs text-[#4d7c4d]">
            Última actualización: {formatTime(processingState.lastUpdateTime)}
          </div>

          {/* Mensaje de error */}
          {processingState.status === 'error' && processingState.errorMessage && (
            <div className="bg-red-900/20 border border-red-500/30 rounded p-2 text-xs text-red-300">
              {processingState.errorMessage}
            </div>
          )}

          {/* Mensaje de éxito */}
          {processingState.status === 'completed' && (
            <div className="bg-green-900/20 border border-green-500/30 rounded p-2 text-xs text-green-300">
              ✓ Procesamiento completado exitosamente
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

