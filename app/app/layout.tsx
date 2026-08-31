'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import SearchModal from '@/components/SearchModal';
import { 
  BookOpen, Compass, FileCheck, 
  Shield, Settings, LogOut, Search, Bell, Sun, 
  Moon, Menu, X, ShieldAlert
} from 'lucide-react';
import { isSuperAdmin, isAdmin } from '@/lib/auth-helpers';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      if (typeof window !== 'undefined') {
        window.location.replace('/auth');
      } else {
        router.replace('/auth');
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-neutral-400">
        <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center font-mono text-xs font-bold text-white mb-3 animate-pulse">
          ED
        </div>
        <div className="text-xs font-mono tracking-widest uppercase text-neutral-300">
          Electrodrivers OS...
        </div>
        {!loading && !user && (
          <div className="text-[11px] text-neutral-500 mt-2">
            Перенаправление на страницу входа...
          </div>
        )}
      </div>
    );
  }

  if (user.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black dark:bg-black light:bg-neutral-50 p-4 text-white dark:text-white light:text-black">
        <div className="glass-panel max-w-md w-full p-6 rounded-xl border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 text-left">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-200 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 flex items-center justify-center mb-3">
            <ShieldAlert className="w-4 h-4 text-neutral-300 dark:text-neutral-300 light:text-neutral-700" />
          </div>
          <h2 className="text-base font-semibold mb-1">Аккаунт на модерации</h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-400 light:text-neutral-600 mb-6 leading-relaxed">
            Учетная запись <span className="font-mono font-semibold">{user.email}</span> ({user.telegram_nickname}) зарегистрирована и ожидает подтверждения администратором.
          </p>
          <button
            onClick={() => logout()}
            className="w-full py-2 px-3 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-200 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-300 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-900 transition-colors"
          >
            Выйти / Сменить пользователя
          </button>
        </div>
      </div>
    );
  }

  if (user.status === 'blocked') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black dark:bg-black light:bg-neutral-50 p-4 text-white dark:text-white light:text-black">
        <div className="glass-panel max-w-md w-full p-6 rounded-xl border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 text-left">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-200 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 flex items-center justify-center mb-3">
            <ShieldAlert className="w-4 h-4 text-neutral-300 dark:text-neutral-300 light:text-neutral-700" />
          </div>
          <h2 className="text-base font-semibold mb-1">Доступ заблокирован</h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-400 light:text-neutral-600 mb-6 leading-relaxed">
            Ваша учетная запись деактивирована администратором портала.
          </p>
          <button
            onClick={() => logout()}
            className="w-full py-2 px-3 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-200 hover:bg-neutral-800 border border-neutral-700 text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-900 transition-colors"
          >
            Выйти на экран входа
          </button>
        </div>
      </div>
    );
  }

  const isUserAdmin = isAdmin(user);
  const showAdminPanel = isSuperAdmin(user);

  return (
    <div className="min-h-screen bg-black dark:bg-black light:bg-neutral-50 text-neutral-100 dark:text-neutral-100 light:text-neutral-900 flex flex-col antialiased">
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-60 glass-panel border-r border-neutral-800 dark:border-neutral-800 light:border-neutral-200 light:bg-white flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div>
            {/* Logo */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
              <Link href="/app/knowledge-base" className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-neutral-900 dark:bg-neutral-900 light:bg-black border border-neutral-700 flex items-center justify-center font-mono text-xs font-bold text-white">
                  ED
                </div>
                <div className="font-semibold text-xs tracking-wider text-neutral-100 dark:text-neutral-100 light:text-neutral-900 uppercase">
                  Electrodrivers
                </div>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav */}
            <nav className="p-3 space-y-1">
              <div className="px-2 py-1.5 text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                Разделы
              </div>

              {/* 1. Knowledge Base */}
              <Link
                href="/app/knowledge-base"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  pathname.startsWith('/app/knowledge-base')
                    ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-200 text-white dark:text-white light:text-black font-semibold'
                    : 'text-neutral-400 dark:text-neutral-400 light:text-neutral-600 hover:bg-neutral-900 dark:hover:bg-neutral-900 light:hover:bg-neutral-100 hover:text-white dark:hover:text-white light:hover:text-black'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>База знаний</span>
              </Link>

              {/* 2. Onboarding */}
              <Link
                href="/app/onboarding"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  pathname.startsWith('/app/onboarding')
                    ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-200 text-white dark:text-white light:text-black font-semibold'
                    : 'text-neutral-400 dark:text-neutral-400 light:text-neutral-600 hover:bg-neutral-900 dark:hover:bg-neutral-900 light:hover:bg-neutral-100 hover:text-white dark:hover:text-white light:hover:text-black'
                }`}
              >
                <Compass className="w-4 h-4 shrink-0" />
                <span>Онбординг</span>
              </Link>

              {/* 3. CRM Reports (Only Admin and above) */}
              {isUserAdmin && (
                <Link
                  href="/app/reports"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    pathname.startsWith('/app/reports')
                      ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-200 text-white dark:text-white light:text-black font-semibold'
                      : 'text-neutral-400 dark:text-neutral-400 light:text-neutral-600 hover:bg-neutral-900 dark:hover:bg-neutral-900 light:hover:bg-neutral-100 hover:text-white dark:hover:text-white light:hover:text-black'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileCheck className="w-4 h-4 shrink-0" />
                    <span>CRM отчетов</span>
                  </div>
                  <span className="text-[9px] font-mono px-1 rounded border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 uppercase">
                    Admin
                  </span>
                </Link>
              )}

              {/* SuperAdmin Panel */}
              {showAdminPanel && (
                <div className="pt-3 mt-3 border-t border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
                  <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                    Управление
                  </div>
                  <Link
                    href="/app/admin"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      pathname === '/app/admin'
                        ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-200 text-white dark:text-white light:text-black font-semibold'
                        : 'text-neutral-400 dark:text-neutral-400 light:text-neutral-600 hover:bg-neutral-900 dark:hover:bg-neutral-900 light:hover:bg-neutral-100 hover:text-white dark:hover:text-white light:hover:text-black'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-4 h-4 shrink-0" />
                      <span>Админ-панель</span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 uppercase">
                      Super
                    </span>
                  </Link>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href="/app/settings"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/app/settings'
                      ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-200 text-white dark:text-white light:text-black font-semibold'
                      : 'text-neutral-400 dark:text-neutral-400 light:text-neutral-600 hover:bg-neutral-900 dark:hover:bg-neutral-900 light:hover:bg-neutral-100 hover:text-white dark:hover:text-white light:hover:text-black'
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>Настройки</span>
                </Link>
              </div>
            </nav>
          </div>

          {/* User footer */}
          <div className="p-3 border-t border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
            <div className="p-2 rounded-lg bg-neutral-900/80 dark:bg-neutral-900/80 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 flex items-center justify-between">
              <div className="min-w-0 pr-1">
                <div className="text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-900 truncate">
                  {user.full_name || user.telegram_nickname}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 dark:text-neutral-400 light:text-neutral-600 font-mono">
                  <span className="uppercase">{user.role}</span>
                  <span>•</span>
                  <span className="truncate">{user.telegram_nickname}</span>
                </div>
              </div>

              <button
                onClick={() => logout()}
                className="p-1 text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-black rounded transition-colors shrink-0"
                title="Выйти"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN VIEWPORT */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-black dark:bg-black light:bg-neutral-50">
          {/* Top Bar */}
          <header className="h-14 glass-panel border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200 light:bg-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 text-neutral-300 dark:text-neutral-300 light:text-neutral-700 hover:text-white"
              >
                <Menu className="w-4 h-4" />
              </button>

              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900/60 dark:bg-neutral-900/60 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 text-xs text-neutral-400 dark:text-neutral-400 light:text-neutral-600 hover:text-neutral-200 transition-colors w-44 sm:w-64"
              >
                <Search className="w-3.5 h-3.5 text-neutral-400" />
                <span className="truncate">Поиск по базе знаний...</span>
                <kbd className="hidden sm:inline-block ml-auto text-[10px] font-mono px-1 rounded bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-200 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300">
                  ⌘K
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 bg-neutral-900/60 dark:bg-neutral-900/60 light:bg-neutral-100 text-neutral-400 dark:text-neutral-400 light:text-neutral-700 hover:text-white dark:hover:text-white light:hover:text-black transition-colors"
                title="Тема оформления"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-neutral-200" /> : <Moon className="w-3.5 h-3.5 text-neutral-800" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="p-2 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 bg-neutral-900/60 dark:bg-neutral-900/60 light:bg-neutral-100 text-neutral-400 dark:text-neutral-400 light:text-neutral-700 hover:text-white dark:hover:text-white light:hover:text-black transition-colors"
                  title="Уведомления"
                >
                  <Bell className="w-3.5 h-3.5" />
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-72 glass-panel light:bg-white rounded-xl p-3 shadow-elevated border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 z-50 animate-in fade-in duration-100">
                    <div className="text-xs font-semibold text-neutral-200 dark:text-neutral-200 light:text-neutral-900 pb-2 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
                      Уведомления
                    </div>
                    <div className="py-2 text-xs text-neutral-400 dark:text-neutral-400 light:text-neutral-600">
                      Все регламенты актуализированы.
                    </div>
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="w-full mt-1 py-1 text-[11px] text-center text-neutral-400 dark:text-neutral-400 light:text-neutral-600 hover:text-white dark:hover:text-white light:hover:text-black rounded bg-neutral-800/50 dark:bg-neutral-800/50 light:bg-neutral-100"
                    >
                      Закрыть
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
