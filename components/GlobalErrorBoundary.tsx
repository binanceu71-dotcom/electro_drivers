'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Глобальный Error Boundary: перехватывает ошибки рендеринга и жизненного цикла
 * во всём дереве приложения и показывает fallback вместо белого экрана.
 */
export default class GlobalErrorBoundary extends React.Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Логируем для отладки; в проде можно отправлять в систему мониторинга.
    console.error('[GlobalErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-black dark:bg-black light:bg-neutral-50 p-4 text-white dark:text-white light:text-black">
        <div className="glass-panel max-w-md w-full p-6 rounded-xl border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 text-left">
          <div className="w-10 h-10 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-200 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 flex items-center justify-center mb-4">
            <AlertCircle className="w-5 h-5 text-neutral-300 dark:text-neutral-300 light:text-neutral-700" />
          </div>

          <h1 className="text-base font-semibold mb-1">
            Что-то пошло не так
          </h1>
          <p className="text-xs text-neutral-400 dark:text-neutral-400 light:text-neutral-600 mb-6 leading-relaxed">
            Произошла непредвиденная ошибка. Попробуйте повторить действие или
            перезагрузите страницу.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={this.handleReset}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-200 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-300 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-900 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Попробовать снова
            </button>
            <button
              onClick={this.handleReload}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-200 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-300 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-900 transition-colors"
            >
              Перезагрузить страницу
            </button>
          </div>

          {this.state.error && (
            <details className="mt-4 pt-3 border-t border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
              <summary className="cursor-pointer text-[11px] font-mono text-neutral-500 dark:text-neutral-500 light:text-neutral-500 select-none">
                Подробности для разработчика
              </summary>
              <pre className="mt-2 text-[11px] font-mono text-neutral-500 dark:text-neutral-500 light:text-neutral-600 whitespace-pre-wrap break-words leading-relaxed">
                {this.state.error.message || String(this.state.error)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
