/**
 * Account Ledger - Live Balance Module
 * Shows all 15 currency accounts with real-time updates from analyzer
 */

import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, Database, CheckCircle, Activity, DollarSign } from 'lucide-react';
import { balanceStore, formatCurrency, getCurrencyName, type CurrencyBalance } from '../lib/balances-store';
import { useLanguage } from '../lib/i18n.tsx';

export function AccountLedger() {
  const { t } = useLanguage();
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Initial load
    const initialBalances = balanceStore.getBalances();
    setBalances(initialBalances);
    
    if (initialBalances.length > 0) {
      setLastUpdate(new Date());
    }

    // Subscribe to real-time updates
    const unsubscribe = balanceStore.subscribe((updatedBalances) => {
      setBalances(updatedBalances);
      setLastUpdate(new Date());
      
      // Show live update indicator briefly
      setIsLiveUpdating(true);
      setTimeout(() => setIsLiveUpdating(false), 1000);
      
      console.log('[AccountLedger] Balances updated:', updatedBalances.length);
    });

    return unsubscribe;
  }, []);

  const getTotalBalance = () => {
    return balances.reduce((sum, b) => sum + b.totalAmount, 0);
  };

  const getTotalTransactions = () => {
    return balances.reduce((sum, b) => sum + b.transactionCount, 0);
  };

  const getCurrencyColor = (currency: string, index: number) => {
    if (currency === 'USD') return 'from-[#00ff88] to-[#00cc6a] border-[#00ff88]';
    if (currency === 'EUR') return 'from-[#00ffaa] to-[#00ff88] border-[#00ffaa]';
    if (currency === 'GBP') return 'from-[#00ff88]/90 to-[#00cc6a]/90 border-[#00ff88]/90';
    if (currency === 'CHF') return 'from-[#39ff14] to-[#00ff88] border-[#39ff14]';
    if (index < 8) return 'from-[#00cc6a] to-[#00aa55] border-[#00cc6a]';
    return 'from-[#0d0d0d] to-[#0a0a0a] border-[#1a1a1a]';
  };

  const refreshBalances = () => {
    const fresh = balanceStore.getBalances();
    setBalances(fresh);
    setLastUpdate(new Date());
  };

  return (
    <div className="flex flex-col h-full bg-black overflow-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0d0d0d] to-[#0a0a0a] border-b border-[#00ff88]/30 p-8 sticky top-0 z-10 shadow-[0_4px_20px_rgba(0,255,136,0.2)]">
        <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#e0ffe0] mb-2 flex items-center gap-3">
                <Database className="w-10 h-10 text-[#00ff88] pulse-green" />
                {t.ledgerTitle}
              </h1>
              <p className="text-[#80ff80]">
                {t.ledgerSubtitle}
              </p>
            </div>
          <div className="flex items-center gap-4">
            {isLiveUpdating && (
              <div className="flex items-center gap-2 bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88] px-4 py-2 rounded-lg animate-pulse shadow-[0_0_15px_rgba(0,255,136,0.4)]">
                <Activity className="w-5 h-5 animate-spin" />
                <span className="font-semibold">{t.ledgerUpdating}</span>
              </div>
            )}
            <button
              onClick={refreshBalances}
              className="bg-[#0d0d0d] hover:bg-[#141414] border border-[#1a1a1a] hover:border-[#00ff88] text-[#00ff88] px-4 py-2 rounded-lg flex items-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(0,255,136,0.3)]"
            >
              <RefreshCw className="w-5 h-5" />
              {t.refresh}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-[#00ff88]/30 to-[#00cc6a]/30 border border-[#00ff88] rounded-xl p-6 shadow-[0_0_20px_rgba(0,255,136,0.3)] glass-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#00ff88] text-sm font-semibold">{t.ledgerTotalAccounts}</span>
              <Database className="w-6 h-6 text-[#00ff88]/70" />
            </div>
            <div className="text-4xl font-black text-[#e0ffe0]">{balances.length}</div>
            <div className="text-[#80ff80] text-xs mt-1">{t.ledgerOfCurrencies}</div>
          </div>

          <div className="bg-gradient-to-br from-[#00ffaa]/30 to-[#00ff88]/30 border border-[#00ffaa] rounded-xl p-6 shadow-[0_0_20px_rgba(0,255,170,0.3)] glass-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#00ff88] text-sm font-semibold">{t.ledgerTotalTransactions}</span>
              <TrendingUp className="w-6 h-6 text-[#00ff88]/70" />
            </div>
            <div className="text-4xl font-black text-[#e0ffe0]">{getTotalTransactions().toLocaleString()}</div>
            <div className="text-[#80ff80] text-xs mt-1">{t.ledgerProcessed}</div>
          </div>

          <div className="bg-gradient-to-br from-[#39ff14]/30 to-[#00ff88]/30 border border-[#39ff14] rounded-xl p-6 shadow-[0_0_20px_rgba(57,255,20,0.3)] glass-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#00ff88] text-sm font-semibold">{t.ledgerLastUpdate}</span>
              <CheckCircle className="w-6 h-6 text-[#00ff88]/70" />
            </div>
            <div className="text-lg font-bold text-[#e0ffe0]">
              {lastUpdate ? lastUpdate.toLocaleTimeString() : 'N/A'}
            </div>
            <div className="text-[#80ff80] text-xs mt-1">
              {lastUpdate ? lastUpdate.toLocaleDateString() : t.ledgerNoData}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#00cc6a]/30 to-[#00aa55]/30 border border-[#00cc6a] rounded-xl p-6 shadow-[0_0_20px_rgba(0,204,106,0.3)] glass-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#00ff88] text-sm font-semibold">{t.ledgerStatus}</span>
              <Activity className="w-6 h-6 text-[#00ff88]/70" />
            </div>
            <div className="text-lg font-bold text-[#e0ffe0]">
              {balances.length > 0 ? t.ledgerOperational : t.ledgerNoData}
            </div>
            <div className="text-[#80ff80] text-xs mt-1">
              {isLiveUpdating ? t.ledgerUpdating : t.ledgerWaiting}
            </div>
          </div>
        </div>

        {/* Accounts Grid */}
        {balances.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {balances.map((balance, index) => {
              const isMainCurrency = index < 4; // USD, EUR, GBP, CHF
              const colorClass = getCurrencyColor(balance.currency, index);

              return (
                <div
                  key={balance.currency}
                  className={`bg-gradient-to-br ${colorClass} rounded-xl p-6 shadow-xl border-2 transform transition-all hover:scale-105 hover:shadow-2xl`}
                >
                  {/* Account Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/40">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-5 h-5 text-white" style={{filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.8))'}} />
                        <h3 className="text-xl font-bold text-white" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.9), 1px -1px 2px rgba(0,0,0,0.9), -1px 1px 2px rgba(0,0,0,0.9)'}}>{balance.currency}</h3>
                        {isMainCurrency && (
                          <span className="bg-black text-[#00ff88] border border-[#00ff88] px-2 py-0.5 rounded-full text-xs font-bold shadow-[0_0_10px_rgba(0,255,136,0.5)]">
                            ★ {index === 0 ? t.ledgerPrincipal : index === 1 ? t.ledgerSecondary : index === 2 ? t.ledgerTertiary : t.ledgerFourth}
                          </span>
                        )}
                      </div>
                      <p className="text-white text-sm font-semibold" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.8)'}}>{getCurrencyName(balance.currency)}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-white/80 text-xs font-semibold" style={{textShadow: '1px 1px 1px rgba(0,0,0,0.8)'}}>{t.ledgerAccount}</div>
                      <div className="text-white font-mono text-lg font-bold" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.9)'}}>#{index + 1}</div>
                    </div>
                  </div>

                  {/* Balance Amount */}
                  <div className="mb-4 bg-black/30 border border-black/40 rounded-lg p-4 shadow-inner">
                    <p className="text-white/90 text-xs mb-1 uppercase tracking-wide font-semibold" style={{textShadow: '1px 1px 1px rgba(0,0,0,0.8)'}}>{t.ledgerTotalBalance}</p>
                    <p className="text-3xl font-black text-white" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.9)'}}>
                      {formatCurrency(balance.totalAmount, balance.currency)}
                    </p>
                    <p className="text-white/70 text-xs mt-2 font-medium" style={{textShadow: '1px 1px 1px rgba(0,0,0,0.8)'}}>
                      {t.ledgerUpdatedAt}: {new Date(balance.lastUpdated).toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/30 border border-black/30 rounded-lg p-3">
                      <p className="text-white/80 text-xs mb-1 font-semibold" style={{textShadow: '1px 1px 1px rgba(0,0,0,0.8)'}}>{t.ledgerTransactions}</p>
                      <p className="text-xl font-bold text-white" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.9)'}}>{balance.transactionCount.toLocaleString()}</p>
                    </div>
                    <div className="bg-black/30 border border-black/30 rounded-lg p-3">
                      <p className="text-white/80 text-xs mb-1 font-semibold" style={{textShadow: '1px 1px 1px rgba(0,0,0,0.8)'}}>{t.ledgerAverage}</p>
                      <p className="text-sm font-bold text-white" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.9)'}}>
                        {formatCurrency(balance.averageTransaction, balance.currency)}
                      </p>
                    </div>
                    <div className="bg-black/30 border border-black/30 rounded-lg p-3">
                      <p className="text-white/80 text-xs mb-1 font-semibold" style={{textShadow: '1px 1px 1px rgba(0,0,0,0.8)'}}>{t.ledgerHighest}</p>
                      <p className="text-sm font-bold text-white" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.9)'}}>
                        {balance.largestTransaction > 0 
                          ? formatCurrency(balance.largestTransaction, balance.currency)
                          : '-'}
                      </p>
                    </div>
                    <div className="bg-black/30 border border-black/30 rounded-lg p-3">
                      <p className="text-white/80 text-xs mb-1 font-semibold" style={{textShadow: '1px 1px 1px rgba(0,0,0,0.8)'}}>{t.ledgerLowest}</p>
                      <p className="text-sm font-bold text-white" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.9)'}}>
                        {balance.smallestTransaction < Infinity
                          ? formatCurrency(balance.smallestTransaction, balance.currency)
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#0d0d0d] rounded-xl p-12 text-center border-2 border-dashed border-[#1a1a1a] glass-panel">
            <Database className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-slate-400 mb-2">{t.ledgerNoAccountsLoaded}</h3>
            <p className="text-slate-500 mb-6">
              {t.ledgerNoBalancesInLedger}
            </p>
            <div className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all cursor-pointer">
              {t.ledgerGoToAnalyzer}
            </div>
          </div>
        )}
      </div>

      {/* Live Update Indicator */}
      {balances.length > 0 && (
        <div className="sticky bottom-0 bg-gradient-to-r from-slate-800 to-slate-900 border-t border-slate-700 p-4">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isLiveUpdating ? 'bg-green-400 animate-pulse' : 'bg-blue-400'}`}></div>
                <span className="text-slate-300 text-sm font-semibold">
                  {isLiveUpdating ? t.ledgerUpdating : t.ledgerConnected}
                </span>
              </div>
              <div className="text-slate-400 text-xs">
                {t.ledgerLastUpdate}: {lastUpdate ? lastUpdate.toLocaleString() : 'N/A'}
              </div>
            </div>
        </div>
      )}
    </div>
  );
}

