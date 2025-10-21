/**
 * Toast Notification System
 * Sistema de notificaciones modernas sin dependencias externas
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-[#00ff88] flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-[#39ff14] flex-shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-[#00ffaa] flex-shrink-0" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'border-[#00ff88] bg-[#00ff88]/10';
      case 'error':
        return 'border-red-500 bg-red-950/30';
      case 'warning':
        return 'border-[#39ff14] bg-[#39ff14]/10';
      case 'info':
      default:
        return 'border-[#00ffaa] bg-[#00ffaa]/10';
    }
  };

  return (
    <div
      className={`
        pointer-events-auto min-w-[320px] max-w-md
        bg-[#0d0d0d] border rounded-lg p-4
        shadow-[0_0_30px_rgba(0,0,0,0.8)]
        transition-all duration-300 ease-out
        ${getStyles()}
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#e0ffe0] mb-1">{toast.title}</p>
          {toast.description && (
            <p className="text-xs text-[#80ff80]">{toast.description}</p>
          )}
        </div>
        <button
          onClick={handleClose}
          className="text-[#4d7c4d] hover:text-[#00ff88] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Helper functions
export const toast = {
  success: (title: string, description?: string) => {
    const event = new CustomEvent('add-toast', {
      detail: { type: 'success', title, description }
    });
    window.dispatchEvent(event);
  },
  error: (title: string, description?: string) => {
    const event = new CustomEvent('add-toast', {
      detail: { type: 'error', title, description }
    });
    window.dispatchEvent(event);
  },
  info: (title: string, description?: string) => {
    const event = new CustomEvent('add-toast', {
      detail: { type: 'info', title, description }
    });
    window.dispatchEvent(event);
  },
  warning: (title: string, description?: string) => {
    const event = new CustomEvent('add-toast', {
      detail: { type: 'warning', title, description }
    });
    window.dispatchEvent(event);
  },
};
