import { memo } from 'react';
import { DollarSign, Activity } from 'lucide-react';
import type { CurrencyBalance } from '../lib/balances-store';

interface CurrencyBalanceCardProps {
  balance: CurrencyBalance;
  index: number;
  isProcessing: boolean;
  formatCurrency: (amount: number, currency: string) => string;
}

export const CurrencyBalanceCard = memo(({
  balance,
  index,
  isProcessing,
  formatCurrency
}: CurrencyBalanceCardProps) => {
  const isUSD = balance.currency === 'USD';
  const isEUR = balance.currency === 'EUR';

  return (
    <div
      className={`bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d] border ${
        isUSD ? 'border-[#00ff88]/50' : isEUR ? 'border-[#00cc6a]/40' : 'border-[#00ff88]/20'
      } rounded-xl p-4 sm:p-6 shadow-[0_0_15px_rgba(0,255,136,0.1)] mb-3 sm:mb-4 hover:shadow-[0_0_25px_rgba(0,255,136,0.2)] transition-all`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 pb-3 border-b border-[#00ff88]/20">
        <div className="flex-1 mb-2 sm:mb-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-1">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-[#00ff88]" />
            <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#e0ffe0]">
              {balance.accountName}
            </h4>
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
}, (prevProps, nextProps) => {
  return (
    prevProps.balance.totalAmount === nextProps.balance.totalAmount &&
    prevProps.balance.transactionCount === nextProps.balance.transactionCount &&
    prevProps.isProcessing === nextProps.isProcessing &&
    prevProps.balance.amounts.length === nextProps.balance.amounts.length
  );
});

CurrencyBalanceCard.displayName = 'CurrencyBalanceCard';
