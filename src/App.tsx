import { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, Send, Key, Shield, Wallet, Binary, Eye, Database, Building2, BookOpen, LogOut, FileCheck, Menu } from 'lucide-react';
import { LanguageSelector } from './components/LanguageSelector';
import { Login } from './components/Login';
import { useLanguage } from './lib/i18n.tsx';
import { useAuth } from './lib/auth.tsx';
import { MobileMenu } from './components/ui/MobileMenu';

// Direct imports (not lazy) to avoid issues
import { AccountDashboard } from './components/AccountDashboard';
import { DTC1BProcessor } from './components/DTC1BProcessor';
import { TransferInterface } from './components/TransferInterface';
import { APIKeyManager } from './components/APIKeyManager';
import { AuditLogViewer } from './components/AuditLogViewer';
import { AdvancedBinaryReader } from './components/AdvancedBinaryReader';
import { EnhancedBinaryViewer } from './components/EnhancedBinaryViewer';
import { LargeFileDTC1BAnalyzer } from './components/LargeFileDTC1BAnalyzer';
import { XcpB2BInterface } from './components/XcpB2BInterface';
import { AccountLedger } from './components/AccountLedger';
import { BankBlackScreen } from './components/BankBlackScreen';
import { GlobalProcessingIndicator } from './components/GlobalProcessingIndicator';
import { processingStore } from './lib/processing-store';

type Tab = 'dashboard' | 'processor' | 'transfer' | 'api-keys' | 'audit' | 'binary-reader' | 'hex-viewer' | 'large-file-analyzer' | 'xcp-b2b' | 'ledger' | 'blackscreen';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useLanguage();
  const { isAuthenticated, user, login, logout } = useAuth();

  // Efecto para mantener procesamiento global activo al cambiar de módulo
  useEffect(() => {
    const initializeProcessing = async () => {
      // Cargar estado desde Supabase
      const state = await processingStore.loadState();
      if (state && (state.status === 'processing' || state.status === 'paused')) {
        console.log('[App] Proceso pendiente detectado:', state.fileName, state.progress.toFixed(2) + '%');
      }

      // Suscribirse a cambios para logging
      const unsubscribe = processingStore.subscribe((state) => {
        if (state && state.status === 'processing') {
          // El procesamiento continúa independientemente del módulo activo
        }
      });

      // Manejar evento de navegación desde GlobalProcessingIndicator
      const handleNavigateToAnalyzer = () => {
        setActiveTab('large-file-analyzer');
      };

      window.addEventListener('navigate-to-analyzer', handleNavigateToAnalyzer);

      return () => {
        unsubscribe();
        window.removeEventListener('navigate-to-analyzer', handleNavigateToAnalyzer);
      };
    };

    let cleanup: (() => void) | undefined;
    initializeProcessing().then(fn => { cleanup = fn; });

    return () => cleanup?.();
  }, []);

  // Mostrar login si no está autenticado
  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  const tabs = [
    { id: 'dashboard' as Tab, name: t.navDashboard, icon: LayoutDashboard },
    { id: 'ledger' as Tab, name: t.navLedger, icon: BookOpen },
    { id: 'blackscreen' as Tab, name: t.navBlackScreen, icon: FileCheck },
    { id: 'xcp-b2b' as Tab, name: t.navXcpB2B, icon: Building2 },
    { id: 'processor' as Tab, name: t.navProcessor, icon: FileText },
    { id: 'binary-reader' as Tab, name: t.navBinaryReader, icon: Binary },
    { id: 'hex-viewer' as Tab, name: t.navAnalyzerPro, icon: Eye },
    { id: 'large-file-analyzer' as Tab, name: t.navLargeFileAnalyzer, icon: Database },
    { id: 'transfer' as Tab, name: t.navTransfers, icon: Send },
    { id: 'api-keys' as Tab, name: t.navApiKeys, icon: Key },
    { id: 'audit' as Tab, name: t.navAuditLogs, icon: Shield }
  ];

  return (
    <div className="h-screen flex flex-col bg-black">
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as Tab)}
      />

      <header className="bg-black border-b border-[#1a1a1a] shadow-[0_2px_20px_rgba(0,255,136,0.1)]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Hamburger button for mobile */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                title="Abrir menú de navegación"
                aria-label="Abrir menú de navegación"
              >
                <Menu className="w-6 h-6 text-[#00ff88]" />
              </button>
              <div className="p-2 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] rounded-lg glow-green">
                <Wallet className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#e0ffe0]">{t.headerTitle}</h1>
                <p className="text-sm text-neon font-bold">{t.headerSubtitle}</p>
                <p className="text-xs text-[#4d7c4d]">AES-256-GCM • DTC1B • HMAC-SHA256</p>
              </div>
            </div>

          <div className="flex items-center gap-4">
            <LanguageSelector />
            <div className="text-right">
              <div className="text-xs text-[#4d7c4d]">{t.productionEnvironment}</div>
              <div className="text-sm font-semibold text-neon pulse-green">{t.allSystemsOperational}</div>
              <div className="text-xs text-cyber mt-1 blink-matrix">{t.dtcAnalysisReady}</div>
              <div className="text-xs text-[#80ff80] mt-1 font-mono">👤 {user}</div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg text-[#4d7c4d] hover:text-[#00ff88] hover:border-[#00ff88] hover:shadow-[0_0_15px_rgba(0,255,136,0.3)] transition-all"
              title={t.logoutTitle}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-semibold">{t.logout}</span>
            </button>
          </div>
          </div>
        </div>

        <nav className="px-6 bg-[#0a0a0a] border-t border-[#1a1a1a] hidden lg:block">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-all relative ${
                    isActive
                      ? 'text-[#00ffaa] text-shadow-[0_0_10px_rgba(0,255,136,0.8)]'
                      : 'text-[#4d7c4d] hover:text-[#80ff80]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="flex-1 overflow-hidden">
        {activeTab === 'dashboard' && <AccountDashboard />}
        {activeTab === 'ledger' && <AccountLedger />}
        {activeTab === 'blackscreen' && <BankBlackScreen />}
        {activeTab === 'xcp-b2b' && <XcpB2BInterface />}
        {activeTab === 'processor' && <DTC1BProcessor />}
        {activeTab === 'binary-reader' && <AdvancedBinaryReader />}
        {activeTab === 'hex-viewer' && <EnhancedBinaryViewer />}
        {activeTab === 'large-file-analyzer' && <LargeFileDTC1BAnalyzer />}
        {activeTab === 'transfer' && <TransferInterface />}
        {activeTab === 'api-keys' && <APIKeyManager />}
        {activeTab === 'audit' && <AuditLogViewer />}
      </main>

      <footer className="bg-black border-t border-[#1a1a1a] px-6 py-3 shadow-[0_-2px_20px_rgba(0,255,136,0.1)]">
        <div className="flex items-center justify-between text-xs text-[#4d7c4d]">
          <div className="flex items-center gap-6">
            <span className="hover:text-[#80ff80] transition-colors">{t.footerVersion}</span>
            <span className="hover:text-[#80ff80] transition-colors">{t.footerIsoCompliant}</span>
            <span className="hover:text-[#80ff80] transition-colors">{t.footerPciReady}</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-[#80ff80] transition-colors">{t.footerMultiCurrency}</span>
            <span className="hover:text-[#80ff80] transition-colors">{t.footerEncryption}</span>
            <span className="text-cyber font-bold pulse-green">{t.footerForensicAnalysis}</span>
          </div>
        </div>
      </footer>
      
      {/* Indicador global de procesamiento */}
      <GlobalProcessingIndicator />
    </div>
  );
}

export default App;
