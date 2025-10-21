import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { DTC1BParser } from '../lib/dtc1b-parser';
import { bankingStore } from '../lib/store';

interface FileLoaderProps {
  onFileLoaded: () => void;
}

export function FileLoader({ onFileLoaded }: FileLoaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [preview, setPreview] = useState<{
    size: number;
    blocks: number;
    currencies: string[];
    totalBalance: Record<string, bigint>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setLoading(true);

    const reader = new FileReader();

    reader.onerror = () => {
      setError(`Error al leer el archivo: ${reader.error?.message || 'Error desconocido'}. Intenta copiar el archivo a tu carpeta de Descargas.`);
      setPreview(null);
      setFileData(null);
      setLoading(false);
    };

    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) {
          throw new Error('No se pudo leer el contenido del archivo');
        }

        const data = new Uint8Array(buffer);
        setFileData(data);

        const blocks = DTC1BParser.parseBlocks(data, file.name);

        if (blocks.length === 0) {
          setError('No se detectaron bloques de moneda válidos en el archivo. Asegúrate de que sea un archivo DTC1B con datos de USD, EUR o GBP.');
          setPreview(null);
          setLoading(false);
          return;
        }

        const totalBalance: Record<string, bigint> = {};
        const currencies = new Set<string>();

        blocks.forEach(block => {
          currencies.add(block.currency);
          if (!totalBalance[block.currency]) {
            totalBalance[block.currency] = 0n;
          }
          totalBalance[block.currency] += block.amountMinorUnits;
        });

        setPreview({
          size: data.length,
          blocks: blocks.length,
          currencies: Array.from(currencies),
          totalBalance
        });

        setLoading(false);
      } catch (error) {
        setError('Error al procesar el archivo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
        setPreview(null);
        setFileData(null);
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleLoadFile = async () => {
    if (!selectedFile || !fileData) return;

    setLoading(true);
    setError(null);

    try {
      const newAccounts = await bankingStore.processFileAndCreateAccounts(fileData, selectedFile.name);

      if (newAccounts.length === 0) {
        setError('No se pudieron crear cuentas desde el archivo.');
        return;
      }

      setSelectedFile(null);
      setFileData(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onFileLoaded();
    } catch (error) {
      setError('Error al procesar el archivo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setFileData(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-600 rounded-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Cargar Archivo DTC1B</h2>
            <p className="text-sm text-slate-400">Selecciona un archivo binario desde tu disco local</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".file,.bin,.dtc1b,.dat"
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="cursor-pointer flex flex-col items-center gap-3"
            >
              <div className="p-4 bg-slate-700 rounded-full">
                <Upload className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium mb-1">
                  Click para seleccionar archivo
                </p>
                <p className="text-sm text-slate-400">
                  Formatos soportados: .file, .bin, .dtc1b, .dat
                </p>
              </div>
            </label>
          </div>

          {selectedFile && !loading && (
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">{formatBytes(selectedFile.size)}</p>
                  </div>
                </div>
                <button
                  onClick={handleCancel}
                  className="p-1 hover:bg-slate-600 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {preview && (
                <div className="space-y-3 mt-4 pt-4 border-t border-slate-600">
                  <h3 className="text-sm font-semibold text-white mb-2">Vista Previa del Archivo</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800 rounded p-3">
                      <p className="text-xs text-slate-400 mb-1">Bloques Detectados</p>
                      <p className="text-xl font-bold text-white">{preview.blocks}</p>
                    </div>
                    <div className="bg-slate-800 rounded p-3">
                      <p className="text-xs text-slate-400 mb-1">Tamaño</p>
                      <p className="text-xl font-bold text-white">{formatBytes(preview.size)}</p>
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded p-3">
                    <p className="text-xs text-slate-400 mb-2">Monedas Detectadas</p>
                    <div className="flex gap-2">
                      {preview.currencies.map(currency => (
                        <span
                          key={currency}
                          className="px-2 py-1 bg-blue-900 text-blue-300 rounded text-xs font-mono"
                        >
                          {currency}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded p-3">
                    <p className="text-xs text-slate-400 mb-2">Balance Total por Moneda</p>
                    <div className="space-y-1">
                      {Object.entries(preview.totalBalance).map(([currency, amount]) => (
                        <div key={currency} className="flex justify-between text-sm">
                          <span className="text-slate-300">{currency}:</span>
                          <span className="text-white font-mono">
                            {DTC1BParser.formatAmount(amount, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-green-900/20 border border-green-700 rounded">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-green-300">
                      El archivo es válido y contiene {preview.blocks} cuenta(s) que se pueden cargar.
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-700 rounded mt-3">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-300">{error}</div>
                </div>
              )}

              {preview && !error && (
                <button
                  onClick={handleLoadFile}
                  disabled={loading}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {loading ? 'Cargando...' : `Cargar ${preview.blocks} Cuenta(s)`}
                </button>
              )}
            </div>
          )}

          {loading && !selectedFile && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-600 border-t-blue-500"></div>
              <p className="text-slate-400 mt-3">Analizando archivo...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
