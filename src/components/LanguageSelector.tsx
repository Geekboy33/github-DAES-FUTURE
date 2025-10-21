/**
 * Language Selector Component
 * Toggle between Spanish and English
 */

import { Globe } from 'lucide-react';
import { useLanguage, type Language } from '../lib/i18n.tsx';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
  ];

  return (
    <div className="flex items-center gap-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-1 shadow-[0_0_15px_rgba(0,255,136,0.15)]">
      <Globe className="w-4 h-4 text-[#4d7c4d] ml-2" />
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all font-medium text-sm ${
            language === lang.code
              ? 'bg-gradient-to-br from-[#00ff88] to-[#00cc6a] text-black shadow-[0_0_15px_rgba(0,255,136,0.6)] font-bold'
              : 'text-[#4d7c4d] hover:text-[#80ff80] hover:bg-[#141414] hover:border-[#00ff88]/30'
          }`}
          title={lang.label}
        >
          <span className="text-base">{lang.flag}</span>
          <span>{lang.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}

