/**
 * Confirm Dialog Component
 * Modal de confirmación moderno
 */

import { ReactNode } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  icon?: ReactNode;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  icon,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#0d0d0d] border border-[#00ff88] rounded-xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(0,255,136,0.3)] animate-scale-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            <div className={`p-2 rounded-lg ${
              variant === 'danger'
                ? 'bg-red-500/20'
                : 'bg-[#00ff88]/20'
            }`}>
              {icon || (
                <AlertCircle className={`w-6 h-6 ${
                  variant === 'danger' ? 'text-red-400' : 'text-[#00ff88]'
                }`} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#e0ffe0] mb-2">{title}</h3>
              <p className="text-sm text-[#80ff80]">{message}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#4d7c4d] hover:text-[#00ff88] transition-colors ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0a0a0a] border border-[#1a1a1a] text-[#80ff80] rounded-lg hover:border-[#00ff88] hover:text-[#00ff88] transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`
              px-4 py-2 font-bold rounded-lg transition-all
              ${variant === 'danger'
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                : 'bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00ffaa] hover:to-[#00ff88] text-black shadow-[0_0_20px_rgba(0,255,136,0.4)]'
              }
            `}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
