import { CurrencyBalance } from './balances-store';
import { getSupabaseClient } from './supabase-client';

const supabase = getSupabaseClient();

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
  fileData?: ArrayBuffer;
  fileHash?: string;
  fileLastModified?: number;
  syncStatus: 'synced' | 'syncing' | 'error' | 'local-only';
  lastSyncTime?: string;
  retryCount: number;
}

class ProcessingStore {
  private static STORAGE_KEY = 'dtc1b_processing_state';
  private static SAVE_INTERVAL_MS = 5000;
  private listeners: Array<(state: ProcessingState | null) => void> = [];
  private currentState: ProcessingState | null = null;
  private isProcessingActive: boolean = false;
  private processingController: AbortController | null = null;
  private currentUserId: string | null = null;
  private currentDbId: string | null = null;
  private userIdPromise: Promise<string | null>;
  private lastSaveTime: number = 0;
  private pendingSave: ProcessingState | null = null;
  private saveTimeoutId: NodeJS.Timeout | null = null;

  private currencyPatterns: Map<string, Uint8Array> = new Map();

  constructor() {
    this.userIdPromise = this.initializeUser();
    this.initializeCurrencyPatterns();
    this.userIdPromise.then(() => this.loadState());

    window.addEventListener('beforeunload', () => this.flushPendingSave());
  }

  private async initializeUser(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      this.currentUserId = user?.id || null;
      return this.currentUserId;
    } catch (error) {
      console.error('[ProcessingStore] Error getting user:', error);
      return null;
    }
  }

  private async ensureUserId(): Promise<string | null> {
    if (this.currentUserId) return this.currentUserId;
    return await this.userIdPromise;
  }

  private initializeCurrencyPatterns(): void {
    const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'MXN', 'BRL', 'RUB', 'KRW', 'SGD', 'HKD'];
    const encoder = new TextEncoder();
    currencies.forEach(currency => {
      this.currencyPatterns.set(currency, encoder.encode(currency));
    });
  }

  async calculateFileHash(file: File): Promise<string> {
    try {
      const chunkSize = 1024 * 1024;
      const chunks: ArrayBuffer[] = [];

      const start = file.slice(0, chunkSize);
      chunks.push(await start.arrayBuffer());

      if (file.size > chunkSize * 2) {
        const middle = file.slice(Math.floor(file.size / 2), Math.floor(file.size / 2) + chunkSize);
        chunks.push(await middle.arrayBuffer());
      }

      if (file.size > chunkSize) {
        const end = file.slice(Math.max(0, file.size - chunkSize));
        chunks.push(await end.arrayBuffer());
      }

      const combined = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0));
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      return `${hashHex}-${file.size}-${file.lastModified}`;
    } catch (error) {
      console.error('[ProcessingStore] Error calculating file hash:', error);
      return `fallback-${file.name}-${file.size}-${file.lastModified}`;
    }
  }

  async saveState(state: ProcessingState): Promise<void> {
    this.currentState = state;
    this.pendingSave = state;

    const stateToSave = {
      ...state,
      fileData: undefined
    };

    try {
      localStorage.setItem(ProcessingStore.STORAGE_KEY, JSON.stringify(stateToSave));
      this.notifyListeners();

      const now = Date.now();
      const timeSinceLastSave = now - this.lastSaveTime;

      if (this.saveTimeoutId) {
        clearTimeout(this.saveTimeoutId);
      }

      if (timeSinceLastSave >= ProcessingStore.SAVE_INTERVAL_MS ||
          state.status === 'completed' ||
          state.status === 'error') {
        await this.saveToSupabaseWithRetry(state);
        this.lastSaveTime = now;
        this.pendingSave = null;
      } else {
        this.saveTimeoutId = setTimeout(async () => {
          if (this.pendingSave) {
            await this.saveToSupabaseWithRetry(this.pendingSave);
            this.lastSaveTime = Date.now();
            this.pendingSave = null;
          }
        }, ProcessingStore.SAVE_INTERVAL_MS - timeSinceLastSave);
      }
    } catch (error) {
      console.error('[ProcessingStore] Error guardando estado:', error);
    }
  }

  private async saveToSupabaseWithRetry(state: ProcessingState, maxRetries: number = 3): Promise<boolean> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.currentState = { ...state, syncStatus: 'syncing' };
        this.notifyListeners();

        await this.saveToSupabase(state);

        this.currentState = {
          ...state,
          syncStatus: 'synced',
          lastSyncTime: new Date().toISOString(),
          retryCount: 0
        };
        this.notifyListeners();

        return true;
      } catch (error) {
        lastError = error;
        console.warn(`[ProcessingStore] Intento ${attempt}/${maxRetries} falló:`, error);

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }

    console.error('[ProcessingStore] Todos los intentos fallaron:', lastError);

    this.currentState = {
      ...state,
      syncStatus: 'error',
      retryCount: (state.retryCount || 0) + 1
    };
    this.notifyListeners();

    return false;
  }

  private async saveToSupabase(state: ProcessingState): Promise<void> {
    const userId = await this.ensureUserId();
    if (!userId) {
      console.warn('[ProcessingStore] No hay usuario autenticado');
      if (this.currentState) {
        this.currentState.syncStatus = 'local-only';
        this.notifyListeners();
      }
      return;
    }

    const dataToSave = {
      id: this.currentDbId || undefined,
      user_id: userId,
      file_name: state.fileName,
      file_size: state.fileSize,
      bytes_processed: state.bytesProcessed,
      progress: state.progress,
      status: state.status,
      start_time: state.startTime,
      last_update_time: state.lastUpdateTime,
      balances: state.balances,
      chunk_index: state.chunkIndex,
      total_chunks: state.totalChunks,
      error_message: state.errorMessage,
      file_hash: state.fileHash,
      file_last_modified: state.fileLastModified,
      sync_status: 'synced',
      last_sync_time: new Date().toISOString(),
      retry_count: 0
    };

    if (this.currentDbId) {
      const { error } = await supabase
        .from('processing_state')
        .update(dataToSave)
        .eq('id', this.currentDbId);

      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('processing_state')
        .insert([dataToSave])
        .select()
        .single();

      if (error) throw error;
      if (data) this.currentDbId = data.id;
    }

    console.log('[ProcessingStore] Estado guardado en Supabase');
  }

  async flushPendingSave(): Promise<void> {
    if (this.saveTimeoutId) {
      clearTimeout(this.saveTimeoutId);
      this.saveTimeoutId = null;
    }

    if (this.pendingSave) {
      await this.saveToSupabaseWithRetry(this.pendingSave);
      this.pendingSave = null;
    }
  }

  async loadState(): Promise<ProcessingState | null> {
    try {
      const fromSupabase = await this.loadFromSupabase();
      if (fromSupabase) {
        this.currentState = fromSupabase;
        console.log('[ProcessingStore] Estado cargado desde Supabase:', this.currentState?.progress + '%');
        return this.currentState;
      }

      const saved = localStorage.getItem(ProcessingStore.STORAGE_KEY);
      if (saved) {
        this.currentState = JSON.parse(saved);
        console.log('[ProcessingStore] Estado cargado desde localStorage:', this.currentState?.progress + '%');
        return this.currentState;
      }
    } catch (error) {
      console.error('[ProcessingStore] Error cargando estado:', error);
      await this.clearState();
    }
    return null;
  }

  private async loadFromSupabase(): Promise<ProcessingState | null> {
    const userId = await this.ensureUserId();
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('processing_state')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['processing', 'paused'])
        .order('last_update_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        this.currentDbId = data.id;
        return {
          id: data.id,
          fileName: data.file_name,
          fileSize: data.file_size,
          bytesProcessed: data.bytes_processed,
          progress: parseFloat(data.progress),
          status: data.status,
          startTime: data.start_time,
          lastUpdateTime: data.last_update_time,
          balances: data.balances || [],
          chunkIndex: data.chunk_index,
          totalChunks: data.total_chunks,
          errorMessage: data.error_message,
          fileHash: data.file_hash,
          fileLastModified: data.file_last_modified,
          syncStatus: data.sync_status || 'synced',
          lastSyncTime: data.last_sync_time,
          retryCount: data.retry_count || 0
        };
      }
    } catch (error) {
      console.error('[ProcessingStore] Error cargando desde Supabase:', error);
    }

    return null;
  }

  async findProcessingByFileHash(fileHash: string): Promise<ProcessingState | null> {
    const userId = await this.ensureUserId();
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('processing_state')
        .select('*')
        .eq('user_id', userId)
        .eq('file_hash', fileHash)
        .in('status', ['processing', 'paused'])
        .order('last_update_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        this.currentDbId = data.id;
        console.log('[ProcessingStore] Archivo reconocido! Progreso:', data.progress + '%');
        return {
          id: data.id,
          fileName: data.file_name,
          fileSize: data.file_size,
          bytesProcessed: data.bytes_processed,
          progress: parseFloat(data.progress),
          status: data.status,
          startTime: data.start_time,
          lastUpdateTime: data.last_update_time,
          balances: data.balances || [],
          chunkIndex: data.chunk_index,
          totalChunks: data.total_chunks,
          errorMessage: data.error_message,
          fileHash: data.file_hash,
          fileLastModified: data.file_last_modified,
          syncStatus: data.sync_status || 'synced',
          lastSyncTime: data.last_sync_time,
          retryCount: data.retry_count || 0
        };
      }
    } catch (error) {
      console.error('[ProcessingStore] Error buscando por hash:', error);
    }

    return null;
  }

  getState(): ProcessingState | null {
    return this.currentState;
  }

  async updateProgress(
    bytesProcessed: number,
    progress: number,
    balances: CurrencyBalance[],
    chunkIndex: number
  ): Promise<void> {
    if (!this.currentState) return;

    try {
      this.currentState = {
        ...this.currentState,
        bytesProcessed,
        progress,
        balances,
        chunkIndex,
        lastUpdateTime: new Date().toISOString(),
      };

      await this.saveState(this.currentState);
      await this.saveBalancesToSupabase(balances, progress);
    } catch (error) {
      console.error('[ProcessingStore] Error updating progress:', error);
    }
  }

  async pauseProcessing(): Promise<void> {
    if (!this.currentState) return;

    try {
      this.currentState = {
        ...this.currentState,
        status: 'paused',
        lastUpdateTime: new Date().toISOString(),
      };

      await this.saveState(this.currentState);
    } catch (error) {
      console.error('[ProcessingStore] Error pausing:', error);
    }
  }

  async resumeProcessing(): Promise<void> {
    if (!this.currentState) return;

    try {
      this.currentState = {
        ...this.currentState,
        status: 'processing',
        lastUpdateTime: new Date().toISOString(),
      };

      await this.saveState(this.currentState);
    } catch (error) {
      console.error('[ProcessingStore] Error resuming:', error);
    }
  }

  async completeProcessing(balances: CurrencyBalance[]): Promise<void> {
    if (!this.currentState) return;

    try {
      this.currentState = {
        ...this.currentState,
        status: 'completed',
        progress: 100,
        balances,
        lastUpdateTime: new Date().toISOString(),
      };

      await this.saveState(this.currentState);
      await this.saveBalancesToSupabase(balances, 100, 'completed');
    } catch (error) {
      console.error('[ProcessingStore] Error completing:', error);
    }
  }

  async setError(errorMessage: string): Promise<void> {
    if (!this.currentState) return;

    try {
      this.currentState = {
        ...this.currentState,
        status: 'error',
        errorMessage,
        lastUpdateTime: new Date().toISOString(),
      };

      await this.saveState(this.currentState);
    } catch (error) {
      console.error('[ProcessingStore] Error setting error state:', error);
    }
  }

  async clearState(): Promise<void> {
    await this.flushPendingSave();

    if (this.currentDbId && this.currentUserId) {
      try {
        await supabase
          .from('processing_state')
          .delete()
          .eq('id', this.currentDbId)
          .eq('user_id', this.currentUserId);
        console.log('[ProcessingStore] Estado eliminado de Supabase');
      } catch (error) {
        console.error('[ProcessingStore] Error eliminando de Supabase:', error);
      }
    }

    this.currentState = null;
    this.currentDbId = null;
    localStorage.removeItem(ProcessingStore.STORAGE_KEY);
    this.notifyListeners();
    console.log('[ProcessingStore] Estado limpiado');
  }

  startProcessing(fileName: string, fileSize: number, fileData: ArrayBuffer, fileHash: string, fileLastModified: number): string {
    const id = `process_${Date.now()}`;
    const totalChunks = Math.ceil(fileSize / (10 * 1024 * 1024));

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
      fileData,
      fileHash,
      fileLastModified,
      syncStatus: 'syncing',
      retryCount: 0
    };

    this.saveState(this.currentState);
    return id;
  }

  hasActiveProcessing(): boolean {
    return this.currentState !== null &&
           (this.currentState.status === 'processing' || this.currentState.status === 'paused');
  }

  subscribe(listener: (state: ProcessingState | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentState);

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentState);
      } catch (error) {
        console.error('[ProcessingStore] Error in listener:', error);
      }
    });
  }

  private async compressData(data: ArrayBuffer): Promise<ArrayBuffer> {
    try {
      const stream = new Response(data).body!.pipeThrough(new CompressionStream('gzip'));
      const compressedResponse = new Response(stream);
      return await compressedResponse.arrayBuffer();
    } catch (error) {
      console.warn('[ProcessingStore] Compression not supported, saving uncompressed');
      return data;
    }
  }

  private async decompressData(data: ArrayBuffer): Promise<ArrayBuffer> {
    try {
      const stream = new Response(data).body!.pipeThrough(new DecompressionStream('gzip'));
      const decompressedResponse = new Response(stream);
      return await decompressedResponse.arrayBuffer();
    } catch (error) {
      console.warn('[ProcessingStore] Decompression failed, returning data as-is');
      return data;
    }
  }

  async saveFileDataToIndexedDB(fileData: ArrayBuffer): Promise<boolean> {
    console.log(`[ProcessingStore] Compressing file (${(fileData.byteLength / 1024 / 1024).toFixed(2)} MB)...`);

    const compressed = await this.compressData(fileData);
    const compressionRatio = ((1 - compressed.byteLength / fileData.byteLength) * 100).toFixed(1);

    console.log(`[ProcessingStore] Compressed: ${(fileData.byteLength / 1024 / 1024).toFixed(2)} MB → ${(compressed.byteLength / 1024 / 1024).toFixed(2)} MB (${compressionRatio}% reduction)`);

    return new Promise((resolve) => {
      const request = indexedDB.open('DTC1BProcessing', 2);

      request.onerror = () => {
        console.error('[ProcessingStore] IndexedDB error:', request.error);
        resolve(false);
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['fileData'], 'readwrite');
        const store = transaction.objectStore('fileData');

        const putRequest = store.put({
          id: 'current',
          data: compressed,
          originalSize: fileData.byteLength,
          compressedSize: compressed.byteLength,
          compressed: true,
          timestamp: Date.now()
        });

        putRequest.onerror = () => {
          if (putRequest.error?.name === 'QuotaExceededError') {
            console.warn('[ProcessingStore] Espacio insuficiente en IndexedDB');
            this.clearIndexedDB().then(() => {
              console.log('[ProcessingStore] IndexedDB limpiado');
            });
          }
          resolve(false);
        };

        transaction.oncomplete = () => {
          console.log('[ProcessingStore] FileData guardado en IndexedDB');
          resolve(true);
        };
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('fileData')) {
          db.createObjectStore('fileData', { keyPath: 'id' });
        }
      };
    });
  }

  async loadFileDataFromIndexedDB(): Promise<ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DTC1BProcessing', 2);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['fileData'], 'readonly');
        const store = transaction.objectStore('fileData');
        const getRequest = store.get('current');

        getRequest.onsuccess = async () => {
          const result = getRequest.result;
          if (result && result.data) {
            if (result.compressed) {
              console.log(`[ProcessingStore] Decompressing file (${(result.compressedSize / 1024 / 1024).toFixed(2)} MB → ${(result.originalSize / 1024 / 1024).toFixed(2)} MB)...`);
              const decompressed = await this.decompressData(result.data);
              console.log('[ProcessingStore] FileData decompressed and loaded');
              resolve(decompressed);
            } else {
              console.log('[ProcessingStore] FileData loaded (uncompressed)');
              resolve(result.data);
            }
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

  isProcessing(): boolean {
    return this.isProcessingActive;
  }

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

      const fileHash = await this.calculateFileHash(file);

      const existingProcess = await this.findProcessingByFileHash(fileHash);
      if (existingProcess && resumeFrom === 0) {
        resumeFrom = existingProcess.bytesProcessed;
        console.log(`[ProcessingStore] 🎯 Archivo reconocido! Reanudando desde ${existingProcess.progress.toFixed(2)}%`);

        this.currentState = existingProcess;
        this.notifyListeners();
      }

      const CHUNK_SIZE = 10 * 1024 * 1024;
      const UPDATE_INTERVAL_CHUNKS = 10;
      const totalSize = file.size;
      let bytesProcessed = resumeFrom;
      const balanceTracker: { [currency: string]: CurrencyBalance } = {};
      let chunksSinceLastUpdate = 0;

      if (existingProcess && existingProcess.balances) {
        existingProcess.balances.forEach(balance => {
          balanceTracker[balance.currency] = balance;
        });
      }

      if (totalSize < 2 * 1024 * 1024 * 1024 && resumeFrom === 0) {
        try {
          const buffer = await file.arrayBuffer();
          await this.saveFileDataToIndexedDB(buffer);
        } catch (error) {
          console.warn('[ProcessingStore] No se pudo guardar en IndexedDB:', error);
        }
      }

      const processId = this.startProcessing(file.name, totalSize, new ArrayBuffer(0), fileHash, file.lastModified);
      const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
      let currentChunk = Math.floor(resumeFrom / CHUNK_SIZE);

      let offset = resumeFrom;

      while (offset < totalSize && !signal.aborted) {
        while (this.currentState?.status === 'paused' && !signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (signal.aborted) break;

        const chunkEnd = Math.min(offset + CHUNK_SIZE, totalSize);
        const blob = file.slice(offset, chunkEnd);
        const buffer = await blob.arrayBuffer();
        const chunk = new Uint8Array(buffer);

        this.extractCurrencyBalancesOptimized(chunk, offset, balanceTracker);

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

        chunksSinceLastUpdate++;

        if (chunksSinceLastUpdate >= UPDATE_INTERVAL_CHUNKS || offset >= totalSize) {
          await this.updateProgress(bytesProcessed, progress, balancesArray, currentChunk);
          chunksSinceLastUpdate = 0;
          console.log(`[ProcessingStore] 📊 Batch update: ${progress.toFixed(1)}%`);
        } else {
          this.currentState = {
            ...this.currentState!,
            bytesProcessed,
            progress,
            balances: balancesArray,
            lastUpdateTime: new Date().toISOString()
          };
          localStorage.setItem(ProcessingStore.STORAGE_KEY, JSON.stringify(this.currentState));
          this.notifyListeners();
        }

        if (onProgress) {
          onProgress(progress, balancesArray);
        }

        if (typeof requestIdleCallback !== 'undefined') {
          await new Promise<void>(resolve => requestIdleCallback(() => resolve()));
        } else {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      if (!signal.aborted) {
        const balancesArray = Object.values(balanceTracker);
        await this.completeProcessing(balancesArray);
        console.log('[ProcessingStore] Procesamiento completado');
      }

    } catch (error) {
      console.error('[ProcessingStore] Error en procesamiento:', error);
      await this.setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      this.isProcessingActive = false;
      this.processingController = null;
      await this.flushPendingSave();
    }
  }

  private extractCurrencyBalancesOptimized(
    data: Uint8Array,
    offset: number,
    currentBalances: { [currency: string]: CurrencyBalance }
  ): void {
    const dataLength = data.length;

    for (let i = 0; i < dataLength - 11; i++) {
      for (const [currency, pattern] of this.currencyPatterns) {
        if (this.matchesPattern(data, i, pattern)) {
          const amount = this.extractAmount(data, i + pattern.length);

          if (amount > 0) {
            this.addToBalance(currentBalances, currency, amount);
            i += pattern.length + 8;
            break;
          }
        }
      }
    }
  }

  private matchesPattern(data: Uint8Array, offset: number, pattern: Uint8Array): boolean {
    if (offset + pattern.length > data.length) return false;

    for (let i = 0; i < pattern.length; i++) {
      if (data[offset + i] !== pattern[i]) return false;
    }
    return true;
  }

  private extractAmount(data: Uint8Array, offset: number): number {
    try {
      if (offset + 4 <= data.length) {
        const view = new DataView(data.buffer, data.byteOffset + offset, 4);
        const potentialAmount = view.getUint32(0, true);

        if (potentialAmount > 0 && potentialAmount < 100000000000) {
          const amount = potentialAmount / 100;
          if (this.isValidAmount(amount)) {
            return amount;
          }
        }
      }

      if (offset + 8 <= data.length) {
        const view = new DataView(data.buffer, data.byteOffset + offset, 8);
        const potentialDouble = view.getFloat64(0, true);

        if (potentialDouble > 0 && potentialDouble < 1000000000 && !isNaN(potentialDouble)) {
          if (this.isValidAmount(potentialDouble)) {
            return potentialDouble;
          }
        }
      }
    } catch (error) {
    }

    return 0;
  }

  private isValidAmount(amount: number): boolean {
    if (amount === 0) return false;
    if (amount < 0.01) return false;
    if (amount > 10000000) return false;

    const decimalPart = amount - Math.floor(amount);
    const decimals = decimalPart.toFixed(10).split('.')[1]?.replace(/0+$/, '').length || 0;

    if (decimals > 2) {
      return false;
    }

    return true;
  }

  private addToBalance(
    currentBalances: { [currency: string]: CurrencyBalance },
    currency: string,
    amount: number
  ): void {
    if (!currentBalances[currency]) {
      currentBalances[currency] = {
        currency,
        totalAmount: 0,
        transactionCount: 0,
        averageTransaction: 0,
        lastUpdated: new Date().toISOString(),
        accountName: this.getCurrencyAccountName(currency),
        amounts: [],
        largestTransaction: 0,
        smallestTransaction: Infinity,
      };
    }

    const balance = currentBalances[currency];
    balance.totalAmount += amount;
    balance.transactionCount++;

    if (balance.amounts.length >= 1000) {
      balance.amounts.shift();
    }
    balance.amounts.push(amount);

    balance.averageTransaction = balance.totalAmount / balance.transactionCount;
    balance.largestTransaction = Math.max(balance.largestTransaction, amount);
    balance.smallestTransaction = Math.min(balance.smallestTransaction, amount);
    balance.lastUpdated = new Date().toISOString();
  }

  private getCurrencyAccountName(currency: string): string {
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
  }

  private async saveBalancesToSupabase(
    balances: CurrencyBalance[],
    progress: number,
    status: 'processing' | 'completed' = 'processing'
  ): Promise<void> {
    if (!this.currentState || !this.currentState.fileHash) return;

    const userId = await this.ensureUserId();
    if (!userId) return;

    try {
      for (const balance of balances) {
        const balanceData = {
          user_id: userId,
          file_hash: this.currentState.fileHash,
          file_name: this.currentState.fileName,
          file_size: this.currentState.fileSize,
          currency: balance.currency,
          account_name: balance.accountName,
          total_amount: balance.totalAmount,
          transaction_count: balance.transactionCount,
          average_transaction: balance.averageTransaction,
          largest_transaction: balance.largestTransaction,
          smallest_transaction: balance.smallestTransaction,
          amounts: balance.amounts,
          last_updated: new Date().toISOString(),
          status: status,
          progress: progress
        };

        const { error } = await supabase
          .from('currency_balances')
          .upsert(balanceData, {
            onConflict: 'user_id,file_hash,currency'
          });

        if (error) {
          console.error('[ProcessingStore] Error saving balance:', error);
        }
      }

      console.log(`[ProcessingStore] Balances saved to Supabase (${balances.length} currencies)`);
    } catch (error) {
      console.error('[ProcessingStore] Error in saveBalancesToSupabase:', error);
    }
  }

  async loadBalancesFromSupabase(fileHash: string): Promise<CurrencyBalance[]> {
    const userId = await this.ensureUserId();
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('currency_balances')
        .select('*')
        .eq('user_id', userId)
        .eq('file_hash', fileHash)
        .order('total_amount', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        console.log(`[ProcessingStore] Loaded ${data.length} balances from Supabase`);
        return data.map(row => ({
          currency: row.currency,
          accountName: row.account_name,
          totalAmount: parseFloat(row.total_amount),
          transactionCount: row.transaction_count,
          averageTransaction: parseFloat(row.average_transaction),
          largestTransaction: parseFloat(row.largest_transaction),
          smallestTransaction: parseFloat(row.smallest_transaction),
          amounts: row.amounts || [],
          lastUpdated: row.last_updated
        }));
      }
    } catch (error) {
      console.error('[ProcessingStore] Error loading balances:', error);
    }

    return [];
  }

  async deleteBalancesFromSupabase(fileHash: string): Promise<void> {
    const userId = await this.ensureUserId();
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('currency_balances')
        .delete()
        .eq('user_id', userId)
        .eq('file_hash', fileHash);

      if (error) throw error;
      console.log('[ProcessingStore] Balances deleted from Supabase');
    } catch (error) {
      console.error('[ProcessingStore] Error deleting balances:', error);
    }
  }
}

export const processingStore = new ProcessingStore();
