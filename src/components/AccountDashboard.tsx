import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, AlertCircle, FileUp, FolderOpen, Eye, Database, Shield, Key, CheckCircle } from 'lucide-react';
import { bankingStore, Account, Transfer } from '../lib/store';
import { DTC1BParser } from '../lib/dtc1b-parser';
import { BulkFileLoader } from './BulkFileLoader';
import { balanceStore, formatCurrency, type CurrencyBalance } from '../lib/balances-store';
import { useLanguage } from '../lib/i18n.tsx';
import { toast } from './ui/Toast';

export function AccountDashboard() {
  const { t } = useLanguage();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showFileLoader, setShowFileLoader] = useState(false);
  const [analyzedBalances, setAnalyzedBalances] = useState<CurrencyBalance[]>([]);

  useEffect(() => {
    loadAccounts();
    
    // Load analyzed balances from store
    const loadAnalyzedBalances = () => {
      const balances = balanceStore.getBalances();
      setAnalyzedBalances(balances);
    };
    
    loadAnalyzedBalances();
    
    // Subscribe to balance changes
    const unsubscribe = balanceStore.subscribe((balances) => {
      setAnalyzedBalances(balances);
      console.log('[AccountDashboard] Balances updated:', balances.length);
    });
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadTransfers(selectedAccount.id);
    }
  }, [selectedAccount]);

  const loadAccounts = () => {
    // Cargar cuentas y ordenarlas por moneda: USD, EUR, GBP, CHF, resto
    const allAccounts = bankingStore.getAccounts();
    const sortedAccounts = allAccounts.sort((a, b) => {
      const currencyOrder: { [key: string]: number } = {
        'USD': 1,
        'EUR': 2,
        'GBP': 3,
        'CHF': 4
      };
      
      const orderA = currencyOrder[a.currencyISO] || 999;
      const orderB = currencyOrder[b.currencyISO] || 999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Si tienen la misma prioridad, ordenar por balance (mayor a menor)
      return Number(b.balanceMinorUnits - a.balanceMinorUnits);
    });
    
    setAccounts(sortedAccounts);
    
    // Guardar balances en localStorage
    const balances: { [currency: string]: string } = {};
    sortedAccounts.forEach(acc => {
      if (!balances[acc.currencyISO]) {
        balances[acc.currencyISO] = '0';
      }
      balances[acc.currencyISO] = (BigInt(balances[acc.currencyISO]) + acc.balanceMinorUnits).toString();
    });
    localStorage.setItem('currency_balances', JSON.stringify(balances));
    
    if (!selectedAccount && sortedAccounts.length > 0) {
      setSelectedAccount(sortedAccounts[0]);
    }
  };

  const loadTransfers = (accountId: string) => {
    setTransfers(bankingStore.getTransfersByAccount(accountId));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);

      const newAccounts = await bankingStore.processFileAndCreateAccounts(data, file.name);

      if (newAccounts.length === 0) {
        toast.warning(t.dashboardNoCurrencyBlocks);
      } else {
        toast.success(t.dashboardFileProcessed.replace('{count}', newAccounts.length.toString()));
        loadAccounts();
      }
    } catch (error) {
      toast.error(t.dashboardErrorProcessing, error instanceof Error ? error.message : t.dashboardUnknownError);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const generateSampleFile = async () => {
    setUploading(true);
    try {
      const sampleData = DTC1BParser.createSampleDTC1BFile();
      const newAccounts = await bankingStore.processFileAndCreateAccounts(sampleData, 'sample-dtc1b.bin');
      toast.success(t.dashboardSampleCreated.replace('{count}', newAccounts.length.toString()));
      loadAccounts();
    } catch (error) {
      toast.error(t.dashboardErrorCreatingSample, error instanceof Error ? error.message : t.dashboardUnknownError);
    } finally {
      setUploading(false);
    }
  };

  const getTotalBalance = (currency: 'EUR' | 'USD' | 'GBP' | 'CHF') => {
    return accounts
      .filter(acc => acc.currencyISO === currency && acc.status === 'active')
      .reduce((sum, acc) => sum + acc.balanceMinorUnits, 0n);
  };

  const formatAmount = (amount: bigint, currency: string) => {
    return DTC1BParser.formatAmount(amount, currency);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-[#00ff88]';
      case 'pending': return 'text-[#39ff14]';
      case 'failed': return 'text-red-400';
      case 'reversed': return 'text-[#4d7c4d]';
      default: return 'text-[#80ff80]';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30',
      frozen: 'bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/30',
      closed: 'bg-red-900/30 text-red-400 border border-red-500/30'
    };
    return colors[status as keyof typeof colors] || 'bg-[#0d0d0d] text-[#4d7c4d] border border-[#1a1a1a]';
  };

  if (showFileLoader || accounts.length === 0) {
    return (
      <div className="flex flex-col h-full bg-black p-6">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {accounts.length === 0 && (
            <div className="p-6 bg-[#0d0d0d] border border-[#00ff88]/30 rounded-lg glass-panel">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#00ff88] flex-shrink-0 mt-0.5 pulse-green" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#00ffaa] mb-1">{t.dashboardWelcomeTitle}</h3>
                  <p className="text-sm text-[#80ff80]">
                    {t.dashboardWelcomeMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          <BulkFileLoader
            onFileLoaded={() => {
              loadAccounts();
              setShowFileLoader(false);
            }}
          />

          <div className="flex items-center justify-center">
            <button
              onClick={generateSampleFile}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-[#0d0d0d] hover:bg-[#141414] disabled:bg-[#0a0a0a] text-[#00ff88] border border-[#1a1a1a] hover:border-[#00ff88] rounded-lg transition-all hover:shadow-[0_0_15px_rgba(0,255,136,0.3)]"
            >
              <FileUp className="w-4 h-4" />
              {t.dashboardOrGenerateSample}
            </button>
          </div>

          {accounts.length > 0 && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowFileLoader(false)}
                className="px-6 py-2 bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00ffaa] hover:to-[#00ff88] text-black font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(0,255,136,0.4)] hover:shadow-[0_0_30px_rgba(0,255,136,0.6)]"
              >
                {t.dashboardViewDashboard}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black">

      <div className="grid grid-cols-4 gap-4 p-6">
        {(['USD', 'EUR', 'GBP', 'CHF'] as const).map(currency => {
          const total = getTotalBalance(currency);
          const currencyLabels: { [key: string]: string } = {
            'USD': t.currencyUSD,
            'EUR': t.currencyEUR,
            'GBP': t.currencyGBP,
            'CHF': t.currencyCHF
          };
          return (
            <div key={currency} className="bg-[#0d0d0d] rounded-lg p-6 border border-[#1a1a1a] glass-panel hover:border-[#00ff88]/50 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#80ff80] text-sm font-medium">{currencyLabels[currency]}</span>
                <Wallet className="w-5 h-5 text-[#00ff88] group-hover:text-[#00ffaa] transition-colors" />
              </div>
              <div className="text-2xl font-bold text-[#e0ffe0]">
                {formatAmount(total, currency)}
              </div>
              <div className="text-xs text-[#4d7c4d] mt-1">
                {accounts.filter(a => a.currencyISO === currency).length} {t.dashboardAccountsCount}
              </div>
            </div>
          );
        })}
      </div>

      {/* Analyzed Balances from Large File Analyzer */}
      {analyzedBalances.length > 0 && (
        <div className="px-6 pb-4">
          <div className="bg-gradient-to-r from-[#0d0d0d] to-[#0a0a0a] border border-[#00ff88]/30 rounded-xl p-6 glass-panel shadow-[0_0_20px_rgba(0,255,136,0.2)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-[#00ff88] pulse-green" />
                <div>
                  <h3 className="text-lg font-bold text-[#e0ffe0]">{t.dashboardBalancesTitle}</h3>
                  <p className="text-sm text-[#80ff80]">
                    {analyzedBalances.length} {t.dashboardCurrenciesDetected} | {analyzedBalances.reduce((sum, b) => sum + b.transactionCount, 0).toLocaleString()} {t.dashboardBalancesSubtitle}
                  </p>
                </div>
              </div>
              <CheckCircle className="w-8 h-8 text-[#00ff88] pulse-green" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-h-64 overflow-y-auto">
              {analyzedBalances.map((balance, index) => {
                const isMainCurrency = ['USD', 'EUR', 'GBP', 'CHF'].includes(balance.currency);
                return (
                  <div 
                    key={balance.currency}
                    className={`rounded-lg p-4 border-2 transition-all ${
                      isMainCurrency
                        ? 'bg-gradient-to-br from-[#00ff88]/20 to-[#00cc6a]/20 border-[#00ff88]/50 shadow-[0_0_10px_rgba(0,255,136,0.2)]'
                        : 'bg-[#0d0d0d]/50 border-[#1a1a1a]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-[#e0ffe0] bg-[#0a0a0a] px-2 py-1 rounded border border-[#1a1a1a]">
                        {balance.currency}
                      </span>
                      {index < 4 && (
                        <span className="text-xs text-[#39ff14]">★</span>
                      )}
                    </div>
                    <div className="text-lg font-bold text-[#e0ffe0] mb-1">
                      {formatCurrency(balance.totalAmount, balance.currency)}
                    </div>
                    <div className="text-xs text-[#4d7c4d]">
                      {balance.transactionCount} txns
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-xs text-[#80ff80] flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#00ff88]" />
              <span>{t.dashboardBalancesSaved}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-3 gap-6 px-6 pb-6 overflow-hidden">
        <div className="bg-[#0d0d0d] rounded-lg border border-[#1a1a1a] flex flex-col overflow-hidden glass-panel">
          <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
            <h2 className="text-lg font-semibold text-[#e0ffe0]">{t.dashboardAccounts.charAt(0).toUpperCase() + t.dashboardAccounts.slice(1)}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFileLoader(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00ffaa] hover:to-[#00ff88] text-black text-sm rounded transition-all shadow-[0_0_10px_rgba(0,255,136,0.3)] font-semibold"
              >
                <FolderOpen className="w-3 h-3" />
                {t.dashboardLoadFiles}
              </button>
              <button
                onClick={loadAccounts}
                className="p-2 hover:bg-[#141414] rounded transition-colors border border-[#1a1a1a] hover:border-[#00ff88]"
                title={t.refresh}
                aria-label={t.refresh}
              >
                <RefreshCw className="w-4 h-4 text-[#4d7c4d] hover:text-[#00ff88]" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-2">
            {accounts.map(account => (
              <div
                key={account.id}
                onClick={() => setSelectedAccount(account)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedAccount?.id === account.id
                    ? 'bg-gradient-to-r from-[#00ff88]/20 to-[#00cc6a]/20 border-2 border-[#00ff88] shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                    : 'bg-[#0a0a0a] hover:bg-[#111111] border-2 border-[#1a1a1a] hover:border-[#00ff88]/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-[#80ff80]">{account.accountRef}</span>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusBadge(account.status)}`}>
                    {account.status}
                  </span>
                </div>
                <div className="text-xl font-bold text-[#e0ffe0]">
                  {formatAmount(account.balanceMinorUnits, account.currencyISO)}
                </div>
                <div className="text-xs text-[#4d7c4d] mt-1">
                  {account.currencyISO} • Created {account.createdAt.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 bg-[#0d0d0d] rounded-lg border border-[#1a1a1a] flex flex-col overflow-hidden glass-panel">
          <div className="p-4 border-b border-[#1a1a1a]">
            <h2 className="text-lg font-semibold text-[#e0ffe0]">
              {selectedAccount ? `${t.dashboardTransactions.charAt(0).toUpperCase() + t.dashboardTransactions.slice(1)} - ${selectedAccount.accountRef}` : t.select + ' ' + t.dashboardAccounts.charAt(0).toUpperCase() + t.dashboardAccounts.slice(1)}
            </h2>
          </div>

          {selectedAccount ? (
            <div className="flex-1 overflow-auto">
              {transfers.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[#4d7c4d]">
                  {t.dashboardNoTransfers}
                </div>
              ) : (
                <div className="divide-y divide-[#1a1a1a]">
                  {transfers.map(transfer => {
                    const isOutgoing = transfer.fromAccountId === selectedAccount.id;
                    const otherAccountId = isOutgoing ? transfer.toAccountId : transfer.fromAccountId;
                    const otherAccount = bankingStore.getAccount(otherAccountId);

                    return (
                      <div key={transfer.id} className="p-4 hover:bg-[#111111] transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {isOutgoing ? (
                                <TrendingDown className="w-4 h-4 text-red-400" />
                              ) : (
                                <TrendingUp className="w-4 h-4 text-[#00ff88]" />
                              )}
                              <span className="font-medium text-[#e0ffe0]">
                                {isOutgoing ? 'Sent to' : 'Received from'} {otherAccount?.accountRef || otherAccountId}
                              </span>
                            </div>
                            <div className="text-xs text-[#4d7c4d] space-y-1">
                              <div>Ref: {transfer.reference}</div>
                              <div>{transfer.createdAt.toLocaleString()}</div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`text-lg font-bold ${isOutgoing ? 'text-red-400' : 'text-[#00ff88]'}`}>
                              {isOutgoing ? '−' : '+'} {formatAmount(transfer.amountMinorUnits, transfer.currencyISO)}
                            </div>
                            <div className={`text-xs mt-1 ${getStatusColor(transfer.status)}`}>
                              {transfer.status}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[#4d7c4d]">
              Select an account to view transactions
            </div>
          )}
        </div>
      </div>

      {/* Sección de Herramientas Avanzadas DTC1B */}
      <div className="bg-[#0d0d0d]/50 border-t border-[#1a1a1a] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-[#39ff14] pulse-green" />
            <h3 className="text-lg font-bold text-[#e0ffe0]">Herramientas Avanzadas de Análisis DTC1B</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-[#0a0a0a]/50 rounded-lg p-4 border border-[#1a1a1a] glass-panel hover:border-[#00ff88]/30 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-[#00ff88]/20 rounded-lg">
                  <Eye className="w-5 h-5 text-[#00ff88]" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#e0ffe0]">Analizador Profesional</h4>
                  <p className="text-xs text-[#80ff80]">Ingeniería inversa completa</p>
                </div>
              </div>
              <p className="text-sm text-[#80ff80] mb-3">
                Análisis avanzado de archivos DTC1B con detección automática de estructuras,
                extracción de transacciones y análisis forense profesional.
              </p>
              <div className="text-xs text-[#4d7c4d]">
                • Estructura de bloques • Códigos de moneda • Análisis de seguridad
              </div>
            </div>

            <div className="bg-[#0a0a0a]/50 rounded-lg p-4 border border-[#1a1a1a] glass-panel hover:border-[#00ff88]/30 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#e0ffe0]">Análisis Forense</h4>
                  <p className="text-xs text-[#80ff80]">Investigación avanzada</p>
                </div>
              </div>
              <p className="text-sm text-[#80ff80] mb-3">
                Herramientas profesionales para análisis forense de archivos binarios,
                detección de manipulaciones y evaluación de integridad.
              </p>
              <div className="text-xs text-slate-400">
                • Entropía • Patrones sospechosos • Firma digital • Metadatos
              </div>
            </div>

            <div className="bg-[#0a0a0a]/50 rounded-lg p-4 border border-[#1a1a1a] glass-panel hover:border-[#00ff88]/30 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Key className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#e0ffe0]">Criptoanálisis</h4>
                  <p className="text-xs text-[#80ff80]">Análisis de encriptación</p>
                </div>
              </div>
              <p className="text-sm text-[#80ff80] mb-3">
                Detección automática de algoritmos de encriptación, análisis de
                complejidad y herramientas de recuperación de datos.
              </p>
              <div className="text-xs text-slate-400">
                • AES-GCM • AES-CBC • Fuerza bruta • Análisis de claves
              </div>
            </div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">Acceso a Herramientas Avanzadas</h4>
                <p className="text-sm text-slate-400 mb-3">
                  Navega a la pestaña "Analizador DTC1B Pro" para acceder a todas las funcionalidades profesionales
                  de análisis forense y criptográfico avanzado.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open('/#hex-viewer', '_blank')}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Abrir Analizador Pro
                  </button>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = '/analizador_dtc1b.py';
                      link.download = 'analizador_dtc1b.py';
                      link.click();
                    }}
                    className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Descargar Script Python
                  </button>
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="text-xs text-slate-500 mb-1">Estado del Sistema</div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-green-400">Operativo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
