'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const value = {
    toast: addToast,
    success: (title: string, message?: string) => addToast('success', title, message),
    error: (title: string, message?: string) => addToast('error', title, message),
    warning: (title: string, message?: string) => addToast('warning', title, message),
    info: (title: string, message?: string) => addToast('info', title, message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-neutral-900/95 dark:bg-neutral-900/95 light:bg-white text-neutral-100 dark:text-neutral-100 light:text-neutral-900 border border-neutral-700 dark:border-neutral-700 light:border-neutral-200 shadow-elevated backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-3"
          >
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' && <Check className="w-4 h-4 text-white dark:text-white light:text-black" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-neutral-300 dark:text-neutral-300 light:text-neutral-800" />}
              {t.type === 'warning' && <AlertCircle className="w-4 h-4 text-neutral-400 dark:text-neutral-400 light:text-neutral-700" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-neutral-400 dark:text-neutral-400 light:text-neutral-700" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-xs leading-snug">{t.title}</div>
              {t.message && <div className="text-[11px] text-neutral-400 dark:text-neutral-400 light:text-neutral-600 mt-0.5 leading-relaxed">{t.message}</div>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-neutral-500 hover:text-white dark:hover:text-white light:hover:text-black shrink-0 p-0.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
