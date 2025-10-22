import { CurrencyBalance } from './balances-store';

export interface ProcessingState {
  id: string;
  fileName: string;
  fileSize: number;
  bytesProcessed: number;
  progress: number;
  status: 'idle' | 'processing' | 'paused' | 'completed' | 'error';
  startTime: string;
  lastUpdateTime: string;
  balances: CurrencyBalance[];
  chunkIndex: number;
  totalChunks: number;
  errorMessage?: string;
  fileData?: ArrayBuffer; // Guardar los datos del archivo para reanudar
}

class ProcessingStore {
  private static STORAGE_KEY = 'dtc1b_processing_state';
  private listeners: Array<(state: ProcessingState | null) => void> = [];
  private currentState: ProcessingState | null = null;
  private isProcessingActive: boolean = false;
  private processingController: AbortController | null = null;

  constructor() {
    // Cargar estado al inicializar
    this.loadState();
  }

  // Guardar estado en localStorage
  saveState(state: ProcessingState): void {
    this.currentState = state;
    
    // No guardar fileData en localStorage por tamaño, solo metadata
    const stateToSave = {
      ...state,
      fileData: undefined // No persistir el buffer en localStorage
    };
    
    try {
      localStorage.setItem(
        ProcessingStore.STORAGE_KEY,
        JSON.stringify(stateToSave)
      );
      console.log('[ProcessingStore] Estado guardado:', state.progress + '%');
      this.notifyListeners();
    } catch (error) {
      console.error('[ProcessingStore] Error guardando estado:', error);
    }
  }

  // Cargar estado desde localStorage
  loadState(): ProcessingState | null {
    try {
      const saved = localStorage.getItem(ProcessingStore.STORAGE_KEY);
      if (saved) {
        this.currentState = JSON.parse(saved);
        console.log('[ProcessingStore] Estado cargado:', this.currentState?.progress + '%');
        return this.currentState;
      }
    } catch (error) {
      console.error('[ProcessingStore] Error cargando estado:', error);
    }
    return null;
  }

  // Obtener estado actual
  getState(): ProcessingState | null {
    return this.currentState;
  }

  // Actualizar progreso
  updateProgress(
    bytesProcessed: number,
    progress: number,
    balances: CurrencyBalance[],
    chunkIndex: number
  ): void {
    if (!this.currentState) return;

    this.currentState = {
      ...this.currentState,
      bytesProcessed,
      progress,
      balances,
      chunkIndex,
      lastUpdateTime: new Date().toISOString(),
    };

    this.saveState(this.currentState);
  }

  // Pausar procesamiento
  pauseProcessing(): void {
    if (!this.currentState) return;

    this.currentState = {
      ...this.currentState,
      status: 'paused',
      lastUpdateTime: new Date().toISOString(),
    };

    this.saveState(this.currentState);
  }

  // Reanudar procesamiento
  resumeProcessing(): void {
    if (!this.currentState) return;

    this.currentState = {
      ...this.currentState,
      status: 'processing',
      lastUpdateTime: new Date().toISOString(),
    };

    this.saveState(this.currentState);
  }

  // Completar procesamiento
  completeProcessing(balances: CurrencyBalance[]): void {
    if (!this.currentState) return;

    this.currentState = {
      ...this.currentState,
      status: 'completed',
      progress: 100,
      balances,
      lastUpdateTime: new Date().toISOString(),
    };

    this.saveState(this.currentState);
  }

  // Marcar como error
  setError(errorMessage: string): void {
    if (!this.currentState) return;

    this.currentState = {
      ...this.currentState,
      status: 'error',
      errorMessage,
      lastUpdateTime: new Date().toISOString(),
    };

    this.saveState(this.currentState);
  }

  // Limpiar estado
  clearState(): void {
    this.currentState = null;
    localStorage.removeItem(ProcessingStore.STORAGE_KEY);
    this.notifyListeners();
    console.log('[ProcessingStore] Estado limpiado');
  }

  // Iniciar nuevo procesamiento
  startProcessing(fileName: string, fileSize: number, fileData: ArrayBuffer): string {
    const id = `process_${Date.now()}`;
    const totalChunks = Math.ceil(fileSize / (10 * 1024 * 1024)); // Chunks de 10MB

    this.currentState = {
      id,
      fileName,
      fileSize,
      bytesProcessed: 0,
      progress: 0,
      status: 'processing',
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString(),
      balances: [],
      chunkIndex: 0,
      totalChunks,
      fileData, // Mantener en memoria mientras procesa
    };

    this.saveState(this.currentState);
    return id;
  }

  // Verificar si hay un proceso en curso
  hasActiveProcessing(): boolean {
    return this.currentState !== null && 
           (this.currentState.status === 'processing' || this.currentState.status === 'paused');
  }

  // Suscribirse a cambios
  subscribe(listener: (state: ProcessingState | null) => void): () => void {
    this.listeners.push(listener);
    // Notificar inmediatamente con el estado actual
    listener(this.currentState);
    
    // Retornar función para desuscribirse
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notificar a todos los listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentState));
  }

  // Guardar snapshot de fileData en IndexedDB para archivos muy grandes
  async saveFileDataToIndexedDB(fileData: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DTC1BProcessing', 1);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['fileData'], 'readwrite');
        const store = transaction.objectStore('fileData');
        
        store.put({
          id: 'current',
          data: fileData,
          timestamp: Date.now()
        });

        transaction.oncomplete = () => {
          console.log('[ProcessingStore] FileData guardado en IndexedDB');
          resolve();
        };
        
        transaction.onerror = () => reject(transaction.error);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('fileData')) {
          db.createObjectStore('fileData', { keyPath: 'id' });
        }
      };
    });
  }

  // Cargar fileData desde IndexedDB
  async loadFileDataFromIndexedDB(): Promise<ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DTC1BProcessing', 1);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['fileData'], 'readonly');
        const store = transaction.objectStore('fileData');
        const getRequest = store.get('current');

        getRequest.onsuccess = () => {
          const result = getRequest.result;
          if (result && result.data) {
            console.log('[ProcessingStore] FileData cargado desde IndexedDB');
            resolve(result.data);
          } else {
            resolve(null);
          }
        };

        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('fileData')) {
          db.createObjectStore('fileData', { keyPath: 'id' });
        }
      };
    });
  }

  // Limpiar IndexedDB
  async clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DTC1BProcessing', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['fileData'], 'readwrite');
        const store = transaction.objectStore('fileData');
        store.clear();

        transaction.oncomplete = () => {
          console.log('[ProcessingStore] IndexedDB limpiado');
          resolve();
        };

        transaction.onerror = () => reject(transaction.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Verificar si hay procesamiento activo
  isProcessing(): boolean {
    return this.isProcessingActive;
  }

  // Detener procesamiento
  stopProcessing(): void {
    if (this.processingController) {
      this.processingController.abort();
      this.processingController = null;
    }
    this.isProcessingActive = false;
    if (this.currentState) {
      this.pauseProcessing();
    }
  }

  // Método para iniciar procesamiento global
  async startGlobalProcessing(
    file: File,
    resumeFrom: number = 0,
    onProgress?: (progress: number, balances: CurrencyBalance[]) => void
  ): Promise<void> {
    if (this.isProcessingActive) {
      console.warn('[ProcessingStore] Ya hay un procesamiento activo');
      return;
    }

    this.isProcessingActive = true;
    this.processingController = new AbortController();
    const signal = this.processingController.signal;

    try {
      console.log('[ProcessingStore] Iniciando procesamiento global:', file.name);
      
      const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB
      const totalSize = file.size;
      let bytesProcessed = resumeFrom;
      const balanceTracker: { [currency: string]: CurrencyBalance } = {};

      // Guardar archivo en IndexedDB si es < 2GB
      if (totalSize < 2 * 1024 * 1024 * 1024 && resumeFrom === 0) {
        try {
          const buffer = await file.arrayBuffer();
          await this.saveFileDataToIndexedDB(buffer);
        } catch (error) {
          console.warn('[ProcessingStore] No se pudo guardar en IndexedDB:', error);
        }
      }

      // Iniciar en el store
      const processId = this.startProcessing(file.name, totalSize, new ArrayBuffer(0));
      const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
      let currentChunk = Math.floor(resumeFrom / CHUNK_SIZE);

      // Procesar por chunks
      let offset = resumeFrom;
      let updateCounter = 0;

      while (offset < totalSize && !signal.aborted) {
        // Verificar si está pausado
        while (this.currentState?.status === 'paused' && !signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (signal.aborted) break;

        const chunkEnd = Math.min(offset + CHUNK_SIZE, totalSize);
        const blob = file.slice(offset, chunkEnd);
        const buffer = await blob.arrayBuffer();
        const chunk = new Uint8Array(buffer);

        // Extraer balances (lógica simplificada)
        this.extractCurrencyBalances(chunk, offset, balanceTracker);

        bytesProcessed += chunk.length;
        offset = chunkEnd;
        currentChunk++;

        const progress = (bytesProcessed / totalSize) * 100;
        const balancesArray = Object.values(balanceTracker).sort((a, b) => {
          if (a.currency === 'USD') return -1;
          if (b.currency === 'USD') return 1;
          if (a.currency === 'EUR') return -1;
          if (b.currency === 'EUR') return 1;
          return b.totalAmount - a.totalAmount;
        });

        // Actualizar estado
        this.updateProgress(bytesProcessed, progress, balancesArray, currentChunk);

        // Callback de progreso
        if (onProgress) {
          onProgress(progress, balancesArray);
        }

        // Pausa breve
        if (typeof requestIdleCallback !== 'undefined') {
          await new Promise<void>(resolve => requestIdleCallback(() => resolve()));
        } else {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Completar
      if (!signal.aborted) {
        const balancesArray = Object.values(balanceTracker);
        this.completeProcessing(balancesArray);
        console.log('[ProcessingStore] Procesamiento completado');
      }

    } catch (error) {
      console.error('[ProcessingStore] Error en procesamiento:', error);
      this.setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      this.isProcessingActive = false;
      this.processingController = null;
    }
  }

  // Extraer balances de monedas
  private extractCurrencyBalances(
    data: Uint8Array,
    offset: number,
    currentBalances: { [currency: string]: CurrencyBalance }
  ): void {
    const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'MXN', 'BRL', 'RUB', 'KRW', 'SGD', 'HKD'];
    
    currencies.forEach(currency => {
      const currencyBytes = new TextEncoder().encode(currency);
      
      for (let i = 0; i <= data.length - currencyBytes.length - 8; i++) {
        let match = true;
        for (let j = 0; j < currencyBytes.length; j++) {
          if (data[i + j] !== currencyBytes[j]) {
            match = false;
            break;
          }
        }
        
        if (match) {
          let amount = 0;
          
          try {
            if (i + currencyBytes.length + 4 <= data.length) {
              const view = new DataView(data.buffer, data.byteOffset + i + currencyBytes.length, 4);
              const potentialAmount = view.getUint32(0, true);
              
              if (potentialAmount > 0 && potentialAmount < 100000000000) {
                amount = potentialAmount / 100;
              }
            }
            
            if (amount === 0 && i + currencyBytes.length + 8 <= data.length) {
              const view = new DataView(data.buffer, data.byteOffset + i + currencyBytes.length, 8);
              const potentialDouble = view.getFloat64(0, true);
              
              if (potentialDouble > 0 && potentialDouble < 1000000000 && !isNaN(potentialDouble)) {
                amount = potentialDouble;
              }
            }
            
            if (amount > 0) {
              if (!currentBalances[currency]) {
                currentBalances[currency] = {
                  currency,
                  totalAmount: 0,
                  transactionCount: 0,
                  averageTransaction: 0,
                  lastUpdated: new Date().toISOString(),
                  accountName: `Cuenta en ${currency}`,
                  amounts: [],
                  largestTransaction: 0,
                  smallestTransaction: Infinity,
                };
              }
              
              const balance = currentBalances[currency];
              balance.totalAmount += amount;
              balance.transactionCount++;
              balance.amounts.push(amount);
              balance.averageTransaction = balance.totalAmount / balance.transactionCount;
              balance.largestTransaction = Math.max(balance.largestTransaction, amount);
              balance.smallestTransaction = Math.min(balance.smallestTransaction, amount);
              balance.lastUpdated = new Date().toISOString();
            }
          } catch (error) {
            // Ignorar errores de parsing
          }
        }
      }
    });
  }
}

export const processingStore = new ProcessingStore();

