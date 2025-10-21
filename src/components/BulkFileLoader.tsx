import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, FolderOpen, Loader2, Search, Folder } from 'lucide-react';
import { DTC1BParser } from '../lib/dtc1b-parser';
import { bankingStore } from '../lib/store';

interface FileLoaderProps {
  onFileLoaded: () => void;
}

interface FilePreview {
  file: File;
  fileData: Uint8Array;
  size: number;
  blocks: number;
  currencies: string[];
  totalBalance: Record<string, bigint>;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  accountsCreated?: number;
  isTargetFile?: boolean;
  debugInfo?: {
    firstBytes: string;
    hasUSD: boolean;
    hasEUR: boolean;
    hasGBP: boolean;
    matchesFound: number;
  };
}

export function BulkFileLoader({ onFileLoaded }: FileLoaderProps) {
  const TARGET_FILE_SIZE = 858993459200;
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const [processing, setProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState({ current: 0, total: 0 });
  const [showDebug, setShowDebug] = useState(false);
  const [scanningFolder, setScanningFolder] = useState(false);
  const [targetFileFound, setTargetFileFound] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const readFileAsArrayBuffer = (file: File): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) {
          resolve(new Uint8Array(buffer));
        } else {
          reject(new Error('No se pudo leer el archivo'));
        }
      };
      reader.onerror = () => reject(reader.error || new Error('Error de lectura'));
      reader.readAsArrayBuffer(file);
    });
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setScanningFolder(true);
    setProcessing(true);
    const previews: FilePreview[] = [];

    for (const file of files) {
      try {
        const data = await readFileAsArrayBuffer(file);

        const firstBytes = Array.from(data.slice(0, 64))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ');

        const textDecoder = new TextDecoder('utf-8', { fatal: false });
        const fullText = textDecoder.decode(data);

        const hasUSD = fullText.includes('USD');
        const hasEUR = fullText.includes('EUR');
        const hasGBP = fullText.includes('GBP');

        const matches = DTC1BParser.findCurrencyMatches(data);
        const blocks = DTC1BParser.parseBlocks(data, file.name);

        console.log(`File: ${file.name}`);
        console.log(`Size: ${data.length} bytes`);
        console.log(`First 64 bytes: ${firstBytes}`);
        console.log(`Has USD: ${hasUSD}, EUR: ${hasEUR}, GBP: ${hasGBP}`);
        console.log(`Matches found: ${matches.length}`, matches);
        console.log(`Blocks parsed: ${blocks.length}`, blocks);

        const totalBalance: Record<string, bigint> = {};
        const currencies = new Set<string>();

        blocks.forEach(block => {
          currencies.add(block.currency);
          if (!totalBalance[block.currency]) {
            totalBalance[block.currency] = 0n;
          }
          totalBalance[block.currency] += block.amountMinorUnits;
        });

        const isTargetFile = file.size === TARGET_FILE_SIZE;
        if (isTargetFile) {
          setTargetFileFound(true);
          console.log('🎯 TARGET FILE FOUND:', file.name, 'Size:', file.size, 'bytes');
        }

        previews.push({
          file,
          fileData: data,
          size: data.length,
          blocks: blocks.length,
          currencies: Array.from(currencies),
          totalBalance,
          status: blocks.length > 0 ? 'pending' : 'error',
          error: blocks.length === 0 ? 'No se detectaron bloques válidos' : undefined,
          isTargetFile,
          debugInfo: {
            firstBytes: firstBytes.substring(0, 48) + '...',
            hasUSD,
            hasEUR,
            hasGBP,
            matchesFound: matches.length
          }
        });
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
        previews.push({
          file,
          fileData: new Uint8Array(0),
          size: 0,
          blocks: 0,
          currencies: [],
          totalBalance: {},
          status: 'error',
          error: error instanceof Error ? error.message : 'Error al leer archivo'
        });
      }
    }

    previews.sort((a, b) => {
      if (a.isTargetFile && !b.isTargetFile) return -1;
      if (!a.isTargetFile && b.isTargetFile) return 1;
      return b.size - a.size;
    });

    setSelectedFiles(previews);
    setProcessing(false);
    setScanningFolder(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  const handleLoadAllFiles = async () => {
    setProcessing(true);
    const validFiles = selectedFiles.filter(f => f.status === 'pending');
    setOverallProgress({ current: 0, total: validFiles.length });

    let successCount = 0;
    let totalAccounts = 0;

    for (let i = 0; i < validFiles.length; i++) {
      const filePreview = validFiles[i];

      setSelectedFiles(prev => prev.map(f =>
        f.file === filePreview.file ? { ...f, status: 'processing' as const } : f
      ));

      try {
        const accounts = await bankingStore.processFileAndCreateAccounts(filePreview.fileData, filePreview.file.name);

        setSelectedFiles(prev => prev.map(f =>
          f.file === filePreview.file
            ? { ...f, status: 'success' as const, accountsCreated: accounts.length }
            : f
        ));

        successCount++;
        totalAccounts += accounts.length;
      } catch (error) {
        setSelectedFiles(prev => prev.map(f =>
          f.file === filePreview.file
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Error al procesar'
              }
            : f
        ));
      }

      setOverallProgress({ current: i + 1, total: validFiles.length });
    }

    setProcessing(false);

    if (successCount > 0) {
      setTimeout(() => {
        onFileLoaded();
      }, 1500);
    }
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusIcon = (status: FilePreview['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="w-5 h-5 text-blue-400" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getStatusColor = (status: FilePreview['status']) => {
    switch (status) {
      case 'pending':
        return 'border-blue-700 bg-blue-900/10';
      case 'processing':
        return 'border-yellow-700 bg-yellow-900/10';
      case 'success':
        return 'border-green-700 bg-green-900/10';
      case 'error':
        return 'border-red-700 bg-red-900/10';
    }
  };

  const validFilesCount = selectedFiles.filter(f => f.status === 'pending').length;
  const totalBlocks = selectedFiles.reduce((sum, f) => sum + f.blocks, 0);
  const allCurrencies = [...new Set(selectedFiles.flatMap(f => f.currencies))];

  return (
    <div className="bg-[#0d0d0d] rounded-lg border border-[#1a1a1a] overflow-hidden">
      <div className="p-6 border-b border-[#1a1a1a]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-lg">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Carga de Archivos DTC1B</h2>
              <p className="text-sm text-slate-400">Selecciona archivos desde tu disco local</p>
            </div>
          </div>
          {selectedFiles.length > 0 && (
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
            >
              <Search className="w-3 h-3" />
              {showDebug ? 'Ocultar' : 'Ver'} Debug
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <input
                ref={folderInputRef}
                type="file"
                onChange={handleFolderSelect}
                className="hidden"
                id="folder-input"
                webkitdirectory=""
                directory=""
                multiple
              />
              <label
                htmlFor="folder-input"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="p-4 bg-blue-600 rounded-full">
                  <Folder className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium mb-1">
                    Escanear Carpeta
                  </p>
                  <p className="text-sm text-slate-400">
                    Detecta automáticamente archivos DTC1B
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Recomendado: escanea toda una carpeta
                  </p>
                </div>
              </label>
            </div>

            <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-slate-500 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".file,.bin,.dtc1b,.dat"
                className="hidden"
                id="bulk-file-input"
                multiple
              />
              <label
                htmlFor="bulk-file-input"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="p-4 bg-slate-700 rounded-full">
                  <Upload className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium mb-1">
                    Seleccionar Archivos
                  </p>
                  <p className="text-sm text-slate-400">
                    Formatos: .file, .bin, .dtc1b, .dat
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Selección manual de archivos
                  </p>
                </div>
              </label>
            </div>
          </div>

          {scanningFolder && (
            <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <div>
                  <p className="text-blue-300 font-semibold">Escaneando carpeta...</p>
                  <p className="text-xs text-blue-400">Analizando archivos y detectando formato DTC1B</p>
                </div>
              </div>
            </div>
          )}

          {targetFileFound && (
            <div className="p-4 bg-green-900/20 border-2 border-green-500 rounded-lg animate-pulse">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🎯</div>
                <div>
                  <p className="text-green-300 font-bold text-lg">¡ARCHIVO OBJETIVO ENCONTRADO!</p>
                  <p className="text-xs text-green-400">Tamaño exacto: 858,993,459,200 bytes (800 GB)</p>
                </div>
              </div>
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                <div>
                  <p className="text-white font-semibold">
                    {selectedFiles.length} archivo(s) escaneado(s)
                  </p>
                  {totalBlocks > 0 ? (
                    <p className="text-xs text-slate-400">
                      {totalBlocks} cuentas detectadas • {allCurrencies.join(', ') || 'Sin monedas'}
                    </p>
                  ) : (
                    <p className="text-xs text-red-400">
                      No se detectaron cuentas válidas. Ver información de debug arriba.
                    </p>
                  )}
                </div>
                <button
                  onClick={handleCancel}
                  disabled={processing}
                  className="p-2 hover:bg-slate-600 rounded transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {processing && overallProgress.total > 0 && (
                <div className="p-4 bg-slate-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">Progreso general</span>
                    <span className="text-sm text-slate-300 font-mono">
                      {overallProgress.current} / {overallProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-[#0d0d0d] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${(overallProgress.current / overallProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="max-h-96 overflow-y-auto space-y-2">
                {selectedFiles.map((filePreview, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border transition-all ${
                      filePreview.isTargetFile
                        ? 'border-green-500 bg-green-900/20 ring-2 ring-green-500'
                        : getStatusColor(filePreview.status)
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {filePreview.isTargetFile ? (
                        <div className="text-2xl">🎯</div>
                      ) : (
                        getStatusIcon(filePreview.status)
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium truncate ${filePreview.isTargetFile ? 'text-green-300 text-lg' : 'text-white'}`}>
                            {filePreview.file.name}
                          </p>
                          {filePreview.isTargetFile && (
                            <span className="text-xs px-2 py-0.5 bg-green-600 text-white rounded font-bold">
                              OBJETIVO
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${filePreview.isTargetFile ? 'text-green-400 font-semibold' : 'text-slate-400'}`}>
                          {formatBytes(filePreview.size)} • {filePreview.blocks} cuenta(s)
                        </p>

                        {filePreview.status === 'pending' && filePreview.blocks > 0 && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {filePreview.currencies.map(curr => (
                              <span key={curr} className="text-xs px-2 py-0.5 bg-blue-900 text-blue-300 rounded">
                                {curr}
                              </span>
                            ))}
                          </div>
                        )}

                        {filePreview.status === 'success' && (
                          <p className="text-xs text-green-400 mt-1">
                            ✓ {filePreview.accountsCreated} cuentas creadas
                          </p>
                        )}

                        {filePreview.status === 'error' && (
                          <p className="text-xs text-red-400 mt-1">
                            {filePreview.error}
                          </p>
                        )}

                        {showDebug && filePreview.debugInfo && (
                          <div className="mt-2 p-2 bg-black rounded text-xs font-mono space-y-1">
                            <div className="text-slate-400">Debug Info:</div>
                            <div className="text-slate-300">Primeros bytes: {filePreview.debugInfo.firstBytes}</div>
                            <div className="text-slate-300">
                              Monedas: USD={filePreview.debugInfo.hasUSD ? '✓' : '✗'}
                              {' '}EUR={filePreview.debugInfo.hasEUR ? '✓' : '✗'}
                              {' '}GBP={filePreview.debugInfo.hasGBP ? '✓' : '✗'}
                            </div>
                            <div className="text-slate-300">Matches: {filePreview.debugInfo.matchesFound}</div>
                            {filePreview.blocks === 0 && (
                              <div className="text-yellow-400 mt-1">
                                El archivo no contiene patrones de moneda reconocibles en formato DTC1B
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {validFilesCount > 0 ? (
                <button
                  onClick={handleLoadAllFiles}
                  disabled={processing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando archivos...
                    </>
                  ) : (
                    <>Cargar {validFilesCount} Archivo(s)</>
                  )}
                </button>
              ) : selectedFiles.length > 0 && (
                <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div className="text-sm text-red-300">
                      <p className="font-semibold mb-1">No se pueden cargar los archivos</p>
                      <p>Los archivos seleccionados no contienen datos DTC1B válidos. Verifica que:</p>
                      <ul className="list-disc ml-4 mt-1 space-y-1">
                        <li>Los archivos contengan códigos de moneda (USD, EUR, GBP)</li>
                        <li>Los datos estén en formato binario correcto</li>
                        <li>Los archivos no estén vacíos o corruptos</li>
                      </ul>
                      <p className="mt-2">Activa "Ver Debug" arriba para más información técnica.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
