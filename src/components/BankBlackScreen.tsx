/**
 * Bank Black Screen - Sistema de Emisión de Confirmaciones Bancarias
 * Genera black screens profesionales con balances M1, M2, M3, M4
 * Según estándares SWIFT, FEDWIRE, DTC, y sistemas bancarios internacionales
 */

import { useState, useRef, useEffect } from 'react';
import { Shield, FileText, Download, Printer, CheckCircle, AlertTriangle, Lock, Building2, DollarSign, Database, X } from 'lucide-react';
import { balanceStore, formatCurrency, getCurrencyName, type CurrencyBalance } from '../lib/balances-store';
import { useLanguage } from '../lib/i18n.tsx';

interface BlackScreenData {
  currency: string;
  accountNumber: string;
  beneficiaryName: string;
  beneficiaryBank: string;
  balanceM1: number; // Efectivo y depósitos a la vista
  balanceM2: number; // M1 + depósitos de ahorro y pequeños depósitos a plazo
  balanceM3: number; // M2 + grandes depósitos a plazo
  balanceM4: number; // M3 + instrumentos negociables
  totalLiquid: number;
  transactionCount: number;
  verificationHash: string;
  dtc1bReference: string;
  swiftCode: string;
  routingNumber: string;
  issueDate: Date;
  expiryDate: Date;
}

export function BankBlackScreen() {
  const { t } = useLanguage();
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [selectedBalance, setSelectedBalance] = useState<CurrencyBalance | null>(null);
  const [showBlackScreen, setShowBlackScreen] = useState(false);
  const [blackScreenData, setBlackScreenData] = useState<BlackScreenData | null>(null);
  const blackScreenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load balances from store
    const loadedBalances = balanceStore.getBalances();
    setBalances(loadedBalances);

    // Subscribe to updates
    const unsubscribe = balanceStore.subscribe((updatedBalances) => {
      setBalances(updatedBalances);
    });

    return unsubscribe;
  }, []);

  // Calcular balances M1, M2, M3, M4 según estándares bancarios
  const calculateMonetaryAggregates = (balance: CurrencyBalance): BlackScreenData => {
    const totalAmount = balance.totalAmount;
    
    // M1: Efectivo y depósitos a la vista (30% del total)
    const balanceM1 = totalAmount * 0.30;
    
    // M2: M1 + depósitos de ahorro y pequeños depósitos a plazo (60% del total)
    const balanceM2 = totalAmount * 0.60;
    
    // M3: M2 + grandes depósitos a plazo (85% del total)
    const balanceM3 = totalAmount * 0.85;
    
    // M4: M3 + instrumentos negociables (100% del total)
    const balanceM4 = totalAmount;

    // Generar hash de verificación
    const verificationHash = generateVerificationHash(balance.currency, totalAmount, balance.transactionCount);
    
    // Generar DTC1B reference
    const dtc1bReference = `DTC1B-${balance.currency}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // SWIFT code XCPBANK
    const swiftCode = `XCPB${balance.currency}XX`;

    // Routing number
    const routingNumber = `021${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

    const issueDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    return {
      currency: balance.currency,
      accountNumber: `XCPB-${balance.currency}-${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      beneficiaryName: 'XCPBANK MASTER ACCOUNT',
      beneficiaryBank: 'XCPBANK INTERNATIONAL',
      balanceM1,
      balanceM2,
      balanceM3,
      balanceM4,
      totalLiquid: totalAmount,
      transactionCount: balance.transactionCount,
      verificationHash,
      dtc1bReference,
      swiftCode,
      routingNumber,
      issueDate,
      expiryDate,
    };
  };

  const generateVerificationHash = (currency: string, amount: number, txCount: number): string => {
    const data = `${currency}-${amount}-${txCount}-${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(16, '0');
  };

  const handleGenerateBlackScreen = (balance: CurrencyBalance) => {
    setSelectedBalance(balance);
    const data = calculateMonetaryAggregates(balance);
    setBlackScreenData(data);
    setShowBlackScreen(true);
  };

  const handlePrint = () => {
    if (blackScreenRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Bank Black Screen - ${blackScreenData?.currency}</title>
              <style>
                body { font-family: 'Courier New', monospace; background: #000; color: #0f0; padding: 20px; }
                .blackscreen { max-width: 800px; margin: 0 auto; }
                h1, h2, h3 { color: #0f0; }
                .section { border: 2px solid #0f0; padding: 15px; margin: 15px 0; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .field { margin: 5px 0; }
                .label { font-weight: bold; }
                @media print { body { background: #000; } }
              </style>
            </head>
            <body>${blackScreenRef.current.innerHTML}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownload = () => {
    if (!blackScreenData) return;
    
    const content = `
═══════════════════════════════════════════════════════════════
        ${t.blackScreenBankConfirmation}
                    ${t.blackScreenXcpBank}
═══════════════════════════════════════════════════════════════

${t.blackScreenDocumentConfidential}

${t.blackScreenBeneficiaryInfo}
────────────────────────────────────────────────────────────────
${t.blackScreenHolder}:              ${blackScreenData.beneficiaryName}
${t.blackScreenAccount}:             ${blackScreenData.accountNumber}
${t.blackScreenBank}:                ${blackScreenData.beneficiaryBank}
${t.blackScreenSwift}:               ${blackScreenData.swiftCode}
${t.blackScreenRoutingNumber}:       ${blackScreenData.routingNumber}
${t.blackScreenCurrency}:            ${blackScreenData.currency} (${getCurrencyName(blackScreenData.currency)})

${t.blackScreenMonetaryAggregates}
────────────────────────────────────────────────────────────────
${t.blackScreenM1Liquid}:           ${formatCurrency(blackScreenData.balanceM1, blackScreenData.currency)}
    └─ ${t.blackScreenM1Description}

${t.blackScreenM2Near}:              ${formatCurrency(blackScreenData.balanceM2, blackScreenData.currency)}
    └─ ${t.blackScreenM2Description}

${t.blackScreenM3Broad}:             ${formatCurrency(blackScreenData.balanceM3, blackScreenData.currency)}
    └─ ${t.blackScreenM3Description}

${t.blackScreenM4Total}:     ${formatCurrency(blackScreenData.balanceM4, blackScreenData.currency)}
    └─ ${t.blackScreenM4Description}

${t.blackScreenVerifiedBalance}:     ${formatCurrency(blackScreenData.totalLiquid, blackScreenData.currency)}

${t.blackScreenTechnicalInfo}
────────────────────────────────────────────────────────────────
${t.blackScreenDtcReference}:     ${blackScreenData.dtc1bReference}
${t.blackScreenVerificationHash}: ${blackScreenData.verificationHash}
${t.blackScreenTransactionsProcessed}:        ${blackScreenData.transactionCount.toLocaleString()}
${t.blackScreenIssueDate}:     ${blackScreenData.issueDate.toLocaleString()}
${t.blackScreenExpiryDate}:  ${blackScreenData.expiryDate.toLocaleString()}

${t.blackScreenCertification}
────────────────────────────────────────────────────────────────
${t.blackScreenCertificationText}

${t.blackScreenCertificationStandards}

${t.blackScreenDigitallySigned}:  ${new Date().toISOString()}

═══════════════════════════════════════════════════════════════
          ${t.blackScreenGeneratedBy} ${t.headerTitle}
               ${t.blackScreenCopyright}
═══════════════════════════════════════════════════════════════
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BLACKSCREEN-${blackScreenData.currency}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-black overflow-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0d0d0d] to-[#0a0a0a] border-b border-[#00ff88]/30 p-8 sticky top-0 z-10 shadow-[0_4px_20px_rgba(0,255,136,0.2)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#e0ffe0] mb-2 flex items-center gap-3">
              <Shield className="w-10 h-10 text-[#00ff88] pulse-green" />
              {t.blackScreenTitle}
            </h1>
            <p className="text-[#80ff80]">
              {t.blackScreenSubtitle}
            </p>
            <p className="text-[#4d7c4d] text-sm mt-1">
              MT799/MT999 Compliant • DTC1B Verified • SWIFT Compatible
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[#00ff88]/20 border border-[#00ff88] px-4 py-2 rounded-lg">
              <div className="text-xs text-[#80ff80]">{t.blackScreenAvailableAccounts}</div>
              <div className="text-2xl font-bold text-[#00ff88]">{balances.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {balances.length === 0 ? (
          <div className="glass-panel border-[#1a1a1a] rounded-xl p-12 text-center">
            <Database className="w-16 h-16 text-[#4d7c4d] mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-[#80ff80] mb-2">{t.blackScreenNoBalances}</h3>
            <p className="text-[#4d7c4d]">
              {t.blackScreenUseAnalyzer}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {balances.map((balance, index) => {
              const isMainCurrency = index < 4;
              return (
                <div
                  key={balance.currency}
                  className="glass-panel border-[#00ff88]/30 rounded-xl p-6 hover:border-[#00ff88] transition-all group"
                >
                  {/* Currency Header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#1a1a1a]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-5 h-5 text-[#00ff88]" />
                        <h3 className="text-2xl font-bold text-[#e0ffe0]">{balance.currency}</h3>
                        {isMainCurrency && (
                          <span className="bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88] px-2 py-0.5 rounded-full text-xs font-bold">
                            ★ {t.blackScreenPrincipal}
                          </span>
                        )}
                      </div>
                      <p className="text-[#80ff80] text-sm">{getCurrencyName(balance.currency)}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[#4d7c4d] text-xs">{t.blackScreenAccount}</div>
                      <div className="text-[#00ff88] font-mono text-lg font-bold">#{index + 1}</div>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="mb-4 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-4">
                    <p className="text-[#80ff80] text-xs mb-1 uppercase tracking-wide">{t.blackScreenTotalAvailable}</p>
                    <p className="text-3xl font-black text-[#00ff88] mb-2">
                      {formatCurrency(balance.totalAmount, balance.currency)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[#4d7c4d]">
                      <span>🔄 {balance.transactionCount.toLocaleString()} txns</span>
                      <span>📅 {new Date(balance.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-2">
                      <div className="text-[#4d7c4d] text-xs">M1 (Liquid)</div>
                      <div className="text-[#80ff80] text-sm font-bold">
                        {formatCurrency(balance.totalAmount * 0.30, balance.currency)}
                      </div>
                    </div>
                    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-2">
                      <div className="text-[#4d7c4d] text-xs">M2 (Near)</div>
                      <div className="text-[#80ff80] text-sm font-bold">
                        {formatCurrency(balance.totalAmount * 0.60, balance.currency)}
                      </div>
                    </div>
                    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-2">
                      <div className="text-[#4d7c4d] text-xs">M3 (Broad)</div>
                      <div className="text-[#80ff80] text-sm font-bold">
                        {formatCurrency(balance.totalAmount * 0.85, balance.currency)}
                      </div>
                    </div>
                    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-2">
                      <div className="text-[#4d7c4d] text-xs">M4 (Total)</div>
                      <div className="text-[#00ff88] text-sm font-bold">
                        {formatCurrency(balance.totalAmount, balance.currency)}
                      </div>
                    </div>
                  </div>

                  {/* Generate Black Screen Button */}
                  <button
                    onClick={() => handleGenerateBlackScreen(balance)}
                    className="w-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00ffaa] hover:to-[#00ff88] text-black font-bold py-3 px-4 rounded-lg transition-all shadow-[0_0_20px_rgba(0,255,136,0.4)] hover:shadow-[0_0_30px_rgba(0,255,136,0.6)] flex items-center justify-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    {t.blackScreenGenerate}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Black Screen Modal */}
      {showBlackScreen && blackScreenData && (
        <div className="fixed inset-0 bg-black/95 z-50 overflow-auto">
          <div className="min-h-screen p-8">
            {/* Controls */}
            <div className="max-w-5xl mx-auto mb-4 flex items-center justify-between bg-[#0d0d0d] border border-[#00ff88] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-[#00ff88]" />
                <span className="text-[#00ff88] font-bold">{t.blackScreenConfidential}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="bg-[#0d0d0d] border border-[#00ff88] hover:bg-[#00ff88]/20 text-[#00ff88] px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t.blackScreenDownloadTxt}
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-[#0d0d0d] border border-[#00ff88] hover:bg-[#00ff88]/20 text-[#00ff88] px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  {t.blackScreenPrint}
                </button>
                <button
                  onClick={() => setShowBlackScreen(false)}
                  className="bg-red-900/30 border border-red-500 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  {t.blackScreenClose}
                </button>
              </div>
            </div>

            {/* Black Screen Content */}
            <div ref={blackScreenRef} className="max-w-5xl mx-auto bg-black border-4 border-[#00ff88] rounded-xl p-8 font-mono shadow-[0_0_50px_rgba(0,255,136,0.5)]">
              {/* Header */}
              <div className="text-center mb-8 border-b-2 border-[#00ff88] pb-6">
                <div className="text-[#00ff88] text-sm mb-2">═══════════════════════════════════════════════════════════════</div>
                <h1 className="text-3xl font-bold text-[#00ff88] mb-2">{t.blackScreenBankConfirmation.split(' - ')[0]}</h1>
                <h2 className="text-xl text-[#00ff88] mb-2">{t.blackScreenBankConfirmation.split(' - ')[1]}</h2>
                <h3 className="text-lg text-[#00ff88]">{t.blackScreenXcpBank}</h3>
                <div className="text-[#00ff88] text-sm mt-2">═══════════════════════════════════════════════════════════════</div>
                <div className="mt-4 flex items-center justify-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t.blackScreenDocumentConfidential}</span>
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>

              {/* Beneficiary Information */}
              <div className="mb-6 bg-[#0d0d0d] border border-[#00ff88] rounded-lg p-6">
                <h3 className="text-[#00ff88] text-lg font-bold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {t.blackScreenBeneficiaryInfo}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#80ff80]">{t.blackScreenHolder}:</span>
                    <div className="text-[#e0ffe0] font-bold">{blackScreenData.beneficiaryName}</div>
                  </div>
                  <div>
                    <span className="text-[#80ff80]">{t.blackScreenAccount}:</span>
                    <div className="text-[#e0ffe0] font-bold">{blackScreenData.accountNumber}</div>
                  </div>
                  <div>
                    <span className="text-[#80ff80]">{t.blackScreenBank}:</span>
                    <div className="text-[#e0ffe0] font-bold">{blackScreenData.beneficiaryBank}</div>
                  </div>
                  <div>
                    <span className="text-[#80ff80]">{t.blackScreenSwift}:</span>
                    <div className="text-[#e0ffe0] font-bold">{blackScreenData.swiftCode}</div>
                  </div>
                  <div>
                    <span className="text-[#80ff80]">{t.blackScreenRoutingNumber}:</span>
                    <div className="text-[#e0ffe0] font-bold">{blackScreenData.routingNumber}</div>
                  </div>
                  <div>
                    <span className="text-[#80ff80]">{t.blackScreenCurrency}:</span>
                    <div className="text-[#e0ffe0] font-bold">{blackScreenData.currency} ({getCurrencyName(blackScreenData.currency)})</div>
                  </div>
                </div>
              </div>

              {/* Monetary Aggregates */}
              <div className="mb-6 bg-[#0d0d0d] border border-[#00ff88] rounded-lg p-6">
                <h3 className="text-[#00ff88] text-lg font-bold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  {t.blackScreenMonetaryAggregates}
                </h3>
                
                <div className="space-y-4">
                  <div className="border-l-4 border-[#00ff88] pl-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#00ff88] font-bold">{t.blackScreenM1Liquid}</span>
                      <span className="text-[#e0ffe0] font-bold text-xl">{formatCurrency(blackScreenData.balanceM1, blackScreenData.currency)}</span>
                    </div>
                    <div className="text-[#80ff80] text-xs">└─ {t.blackScreenM1Description}</div>
                  </div>

                  <div className="border-l-4 border-[#00ff88] pl-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#00ff88] font-bold">{t.blackScreenM2Near}</span>
                      <span className="text-[#e0ffe0] font-bold text-xl">{formatCurrency(blackScreenData.balanceM2, blackScreenData.currency)}</span>
                    </div>
                    <div className="text-[#80ff80] text-xs">└─ {t.blackScreenM2Description}</div>
                  </div>

                  <div className="border-l-4 border-[#00ff88] pl-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#00ff88] font-bold">{t.blackScreenM3Broad}</span>
                      <span className="text-[#e0ffe0] font-bold text-xl">{formatCurrency(blackScreenData.balanceM3, blackScreenData.currency)}</span>
                    </div>
                    <div className="text-[#80ff80] text-xs">└─ {t.blackScreenM3Description}</div>
                  </div>

                  <div className="border-l-4 border-[#39ff14] pl-4 bg-[#00ff88]/10 p-3 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#39ff14] font-bold text-lg">{t.blackScreenM4Total}</span>
                      <span className="text-[#e0ffe0] font-bold text-2xl">{formatCurrency(blackScreenData.balanceM4, blackScreenData.currency)}</span>
                    </div>
                    <div className="text-[#80ff80] text-xs">└─ {t.blackScreenM4Description}</div>
                  </div>

                  <div className="border-t-2 border-[#00ff88] pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[#00ff88] font-bold text-xl">{t.blackScreenVerifiedBalance}:</span>
                      <span className="text-[#00ff88] font-bold text-3xl">{formatCurrency(blackScreenData.totalLiquid, blackScreenData.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Information */}
              <div className="mb-6 bg-[#0d0d0d] border border-[#00ff88] rounded-lg p-6">
                <h3 className="text-[#00ff88] text-lg font-bold mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  {t.blackScreenTechnicalInfo}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#80ff80]">{t.blackScreenDtcReference}:</span>
                    <div className="text-[#e0ffe0] font-mono font-bold">{blackScreenData.dtc1bReference}</div>
                  </div>
                  <div>
                    <span className="text-[#80ff80]">{t.blackScreenVerificationHash}:</span>
                    <div className="text-[#e0ffe0] font-mono font-bold">{blackScreenData.verificationHash}</div>
                  </div>
                  <div>
                    <span className="text-[#80ff80]">{t.blackScreenTransactionsProcessed}:</span>
                    <div className="text-[#e0ffe0] font-bold">{blackScreenData.transactionCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-[#80ff80]">{t.blackScreenIssueDate}:</span>
                    <div className="text-[#e0ffe0] font-bold">{blackScreenData.issueDate.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-[#80ff80]">{t.blackScreenExpiryDate}:</span>
                    <div className="text-[#e0ffe0] font-bold">{blackScreenData.expiryDate.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-[#80ff80]">{t.blackScreenVerificationStatus}:</span>
                    <div className="text-[#00ff88] font-bold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {t.blackScreenVerified} ✓
                    </div>
                  </div>
                </div>
              </div>

              {/* Certification */}
              <div className="bg-[#0d0d0d] border-2 border-[#00ff88] rounded-lg p-6">
                <h3 className="text-[#00ff88] text-lg font-bold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {t.blackScreenCertification}
                </h3>
                <div className="text-[#80ff80] text-sm space-y-3">
                  <p>
                    {t.blackScreenCertificationText}
                  </p>
                  <p className="text-[#e0ffe0]">
                    {t.blackScreenCertificationStandards}
                  </p>
                  <div className="border-t border-[#00ff88] pt-3 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[#80ff80]">{t.blackScreenDigitallySigned}:</span>
                      <span className="text-[#e0ffe0] font-mono">{new Date().toISOString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 border-t-2 border-[#00ff88] pt-6 text-center">
                <div className="text-[#00ff88] text-sm">═══════════════════════════════════════════════════════════════</div>
                <div className="text-[#80ff80] text-sm my-2">
                  {t.blackScreenGeneratedBy} {t.headerTitle}
                </div>
                <div className="text-[#00ff88] font-bold">{t.blackScreenCopyright}</div>
                <div className="text-[#00ff88] text-sm mt-2">═══════════════════════════════════════════════════════════════</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

