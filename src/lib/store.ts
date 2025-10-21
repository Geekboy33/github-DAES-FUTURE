export interface Account {
  id: string;
  accountRef: string;
  currencyISO: 'EUR' | 'USD' | 'GBP' | 'CHF';
  balanceMinorUnits: bigint;
  status: 'active' | 'frozen' | 'closed';
  createdAt: Date;
  fileId: string;
  blockOffset: number;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amountMinorUnits: bigint;
  currencyISO: 'EUR' | 'USD' | 'GBP' | 'CHF';
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  metadata: Record<string, unknown>;
  metadataHash: string;
  initiatedBy: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface APIKey {
  id: string;
  keyHash: string;
  keySecretHash: string;
  permissions: string[];
  active: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  publicKey: string;
}

export interface AuditLog {
  id: string;
  service: string;
  action: string;
  actorId: string;
  data: Record<string, unknown>;
  hmacSignature: string;
  createdAt: Date;
}

export interface DTC1BFile {
  id: string;
  filename: string;
  fileSize: number;
  data: Uint8Array;
  encryptionMetadata?: {
    nonce: string;
    keyId: string;
    aad?: string;
  };
  processed: boolean;
  createdAt: Date;
}

class BankingStore {
  private accounts: Map<string, Account> = new Map();
  private transfers: Map<string, Transfer> = new Map();
  private apiKeys: Map<string, APIKey> = new Map();
  private auditLogs: AuditLog[] = [];
  private files: Map<string, DTC1BFile> = new Map();
  private fileDataCache: Map<string, Uint8Array> = new Map();

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const storedFiles = localStorage.getItem('dtc1b_files');
      if (storedFiles) {
        const filesData = JSON.parse(storedFiles);
        filesData.forEach((fileData: any) => {
          const uint8Array = new Uint8Array(fileData.data);
          const file: DTC1BFile = {
            ...fileData,
            data: uint8Array,
            createdAt: new Date(fileData.createdAt)
          };
          this.files.set(file.id, file);
          this.fileDataCache.set(file.id, uint8Array);
        });
      }

      const storedAccounts = localStorage.getItem('dtc1b_accounts');
      if (storedAccounts) {
        const accountsData = JSON.parse(storedAccounts);
        accountsData.forEach((acc: any) => {
          this.accounts.set(acc.id, {
            ...acc,
            balanceMinorUnits: BigInt(acc.balanceMinorUnits),
            createdAt: new Date(acc.createdAt)
          });
        });
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }

  private saveToLocalStorage() {
    try {
      const filesData = Array.from(this.files.values()).map(file => ({
        ...file,
        data: Array.from(file.data),
        createdAt: file.createdAt.toISOString()
      }));
      localStorage.setItem('dtc1b_files', JSON.stringify(filesData));

      const accountsData = Array.from(this.accounts.values()).map(acc => ({
        ...acc,
        balanceMinorUnits: acc.balanceMinorUnits.toString(),
        createdAt: acc.createdAt.toISOString()
      }));
      localStorage.setItem('dtc1b_accounts', JSON.stringify(accountsData));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  getAccounts(): Account[] {
    return Array.from(this.accounts.values());
  }

  getAccount(id: string): Account | undefined {
    return this.accounts.get(id);
  }

  getAccountByRef(ref: string): Account | undefined {
    return Array.from(this.accounts.values()).find(acc => acc.accountRef === ref);
  }

  async processFileAndCreateAccounts(fileData: Uint8Array, filename: string): Promise<Account[]> {
    const { DTC1BParser } = await import('./dtc1b-parser');

    const fileId = `file-${Date.now()}`;
    const file: DTC1BFile = {
      id: fileId,
      filename,
      fileSize: fileData.length,
      data: fileData,
      processed: false,
      createdAt: new Date()
    };

    this.files.set(fileId, file);
    this.fileDataCache.set(fileId, fileData);

    const blocks = DTC1BParser.parseBlocks(fileData, fileId);
    const newAccounts: Account[] = [];

    for (const block of blocks) {
      const accountId = `acc-${fileId}-${block.offsetStart}`;
      const account: Account = {
        id: accountId,
        accountRef: `BLOCK-${fileId.slice(-6)}-${block.offsetStart.toString(16).padStart(6, '0').toUpperCase()}`,
        currencyISO: block.currency as 'EUR' | 'USD' | 'GBP' | 'CHF',
        balanceMinorUnits: block.amountMinorUnits,
        status: 'active',
        createdAt: new Date(),
        fileId: fileId,
        blockOffset: block.offsetStart
      };

      this.accounts.set(accountId, account);
      newAccounts.push(account);
    }

    file.processed = true;
    this.saveToLocalStorage();

    await this.addAuditLog({
      service: 'file',
      action: 'create',
      actorId: 'system',
      data: {
        fileId,
        filename,
        accountsCreated: newAccounts.length,
        totalBalance: newAccounts.reduce((sum, acc) => sum + acc.balanceMinorUnits, 0n).toString()
      }
    });

    return newAccounts;
  }

  async updateAccountBalance(id: string, newBalance: bigint): Promise<void> {
    const account = this.accounts.get(id);
    if (!account) return;

    account.balanceMinorUnits = newBalance;

    const file = this.files.get(account.fileId);
    if (file) {
      const fileData = new Uint8Array(file.data);
      const view = new DataView(fileData.buffer);

      const amountOffset = account.blockOffset + 3;
      if (amountOffset + 8 <= fileData.length) {
        view.setBigUint64(amountOffset, newBalance, false);
        file.data = fileData;
        this.fileDataCache.set(file.id, fileData);
      }
    }

    this.saveToLocalStorage();
  }

  getTransfers(): Transfer[] {
    return Array.from(this.transfers.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  getTransfersByAccount(accountId: string): Transfer[] {
    return this.getTransfers().filter(
      t => t.fromAccountId === accountId || t.toAccountId === accountId
    );
  }

  async createTransfer(
    transfer: Omit<Transfer, 'id' | 'createdAt' | 'metadataHash'>
  ): Promise<Transfer> {
    const { CryptoUtils } = await import('./crypto');

    const fromAccount = this.accounts.get(transfer.fromAccountId);
    const toAccount = this.accounts.get(transfer.toAccountId);

    if (!fromAccount || !toAccount) {
      throw new Error('Account not found');
    }

    if (fromAccount.currencyISO !== transfer.currencyISO || toAccount.currencyISO !== transfer.currencyISO) {
      throw new Error('Currency mismatch');
    }

    if (fromAccount.balanceMinorUnits < transfer.amountMinorUnits) {
      throw new Error('Insufficient balance');
    }

    if (fromAccount.status !== 'active' || toAccount.status !== 'active') {
      throw new Error('Account not active');
    }

    const metadataString = JSON.stringify(transfer.metadata);
    const metadataHash = await CryptoUtils.sha256(metadataString);

    const newTransfer: Transfer = {
      ...transfer,
      id: `txn-${Date.now()}`,
      metadataHash,
      status: 'pending',
      createdAt: new Date()
    };

    this.transfers.set(newTransfer.id, newTransfer);

    await this.updateAccountBalance(
      fromAccount.id,
      fromAccount.balanceMinorUnits - transfer.amountMinorUnits
    );
    await this.updateAccountBalance(
      toAccount.id,
      toAccount.balanceMinorUnits + transfer.amountMinorUnits
    );

    newTransfer.status = 'completed';
    newTransfer.completedAt = new Date();

    await this.addAuditLog({
      service: 'transfer',
      action: 'create',
      actorId: transfer.initiatedBy,
      data: {
        transferId: newTransfer.id,
        from: transfer.fromAccountId,
        to: transfer.toAccountId,
        amount: transfer.amountMinorUnits.toString(),
        currency: transfer.currencyISO
      }
    });

    return newTransfer;
  }

  getAPIKeys(): APIKey[] {
    return Array.from(this.apiKeys.values());
  }

  async createAPIKey(permissions: string[]): Promise<{ apiKey: APIKey; secret: string }> {
    const { CryptoUtils } = await import('./crypto');

    const publicKey = CryptoUtils.generateAPIKey();
    const secret = CryptoUtils.generateAPIKey();

    const keyHash = await CryptoUtils.sha256(publicKey);
    const keySecretHash = await CryptoUtils.sha256(secret);

    const apiKey: APIKey = {
      id: `key-${Date.now()}`,
      keyHash,
      keySecretHash,
      permissions,
      active: true,
      createdAt: new Date(),
      publicKey
    };

    this.apiKeys.set(apiKey.id, apiKey);

    await this.addAuditLog({
      service: 'api_keys',
      action: 'create',
      actorId: 'system',
      data: { keyId: apiKey.id, permissions }
    });

    return { apiKey, secret };
  }

  async verifyAPIKey(publicKey: string, secret: string): Promise<APIKey | null> {
    const { CryptoUtils } = await import('./crypto');

    const keyHash = await CryptoUtils.sha256(publicKey);
    const keySecretHash = await CryptoUtils.sha256(secret);

    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.keyHash === keyHash && apiKey.keySecretHash === keySecretHash && apiKey.active) {
        apiKey.lastUsedAt = new Date();
        return apiKey;
      }
    }

    return null;
  }

  revokeAPIKey(id: string): void {
    const apiKey = this.apiKeys.get(id);
    if (apiKey) {
      apiKey.active = false;
    }
  }

  getAuditLogs(): AuditLog[] {
    return [...this.auditLogs].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  private async addAuditLog(
    log: Omit<AuditLog, 'id' | 'createdAt' | 'hmacSignature'>
  ): Promise<void> {
    const { CryptoUtils } = await import('./crypto');

    const dataString = JSON.stringify(log);
    const hmacSignature = await CryptoUtils.hmacSHA256('audit-secret-key', dataString);

    const auditLog: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      hmacSignature,
      createdAt: new Date()
    };

    this.auditLogs.push(auditLog);
  }

  getFileData(fileId: string): Uint8Array | null {
    return this.fileDataCache.get(fileId) || null;
  }

  downloadFile(fileId: string): void {
    const file = this.files.get(fileId);
    if (!file) return;

    const blob = new Blob([file.data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  getFiles(): DTC1BFile[] {
    return Array.from(this.files.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  markFileProcessed(id: string): void {
    const file = this.files.get(id);
    if (file) {
      file.processed = true;
    }
  }
}

export const bankingStore = new BankingStore();
