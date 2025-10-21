/**
 * Mobile Menu Component
 * Sidebar responsivo para navegación móvil
 */

import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface Tab {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function MobileMenu({ isOpen, onClose, tabs, activeTab, onTabChange }: MobileMenuProps) {
  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={handleBackdropClick}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 bottom-0 w-80 bg-[#0d0d0d] border-r border-[#1a1a1a]
          z-50 transform transition-transform duration-300 ease-out lg:hidden
          shadow-[0_0_50px_rgba(0,255,136,0.2)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#1a1a1a] bg-gradient-to-r from-[#0d0d0d] to-[#0a0a0a]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#00ff88] mb-1">Navigation</h2>
              <p className="text-xs text-[#4d7c4d]">DAES CoreBanking System</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-[#80ff80] hover:text-[#00ff88]" />
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 100px)' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-all duration-200 ripple-effect
                  ${
                    isActive
                      ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88] shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                      : 'text-[#80ff80] hover:bg-[#1a1a1a] hover:text-[#00ff88] border border-transparent'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-left">{tab.name}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-[#00ff88] pulse-green" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#1a1a1a] bg-[#0d0d0d]">
          <div className="text-xs text-[#4d7c4d] text-center">
            <p>DAES System v3.0.0</p>
            <p className="mt-1">© 2025 All rights reserved</p>
          </div>
        </div>
      </div>
    </>
  );
}
