'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import StarCanvas from '@/components/StarCanvas';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { useTheme } from '@/lib/ThemeContext';
import { 
  Lock, Mail, ArrowRight, ShieldCheck, 
  Sun, Moon, Send, KeyRound, CheckCircle2, UserPlus, 
  Eye, EyeOff, AlertCircle
} from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'pending_notice' | 'forgot_password'>('login');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regTelegram, setRegTelegram] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail || !loginPassword) {
      setLoginError('Пожалуйста, заполните все обязательные поля');
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(loginEmail, loginPassword);
      if (res.success) {
        toast.success('Авторизация выполнена');
        router.push('/app/knowledge-base');
      } else {
        setLoginError(res.error || 'Ошибка входа');
        toast.error('Ошибка входа', res.error);
      }
    } catch (err: any) {
      setLoginError('Сбой подключения к серверу');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regEmail || !regPassword || !regTelegram) {
      setRegError('Заполните Email, Пароль и Никнейм в Telegram');
      return;
    }

    if (regPassword !== regPasswordConfirm) {
      setRegError('Введенные пароли не совпадают');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setSubmitting(true);
    try {
      const res = await register(regEmail, regPassword, regTelegram, regFullName);
      if (res.success) {
        setMode('pending_notice');
        toast.info('Заявка отправлена', 'Ожидайте модерации администратором');
      } else {
        setRegError(res.error || 'Ошибка регистрации');
        toast.error('Ошибка регистрации', res.error);
      }
    } catch (err: any) {
      setRegError('Сбой подключения к серверу');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
    toast.info('Запрос отправлен', `Инструкция выслана на ${forgotEmail}`);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden">
      {/* Monochrome Minimalist Starfield */}
      <StarCanvas />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-white font-mono text-sm font-bold shadow-subtle">
            ED
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-widest text-neutral-100 dark:text-neutral-100 light:text-neutral-900 uppercase">
                Electrodrivers
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-400">
                Corporate Portal
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 bg-neutral-900/60 dark:bg-neutral-900/60 light:bg-white text-neutral-400 hover:text-white transition-all shadow-subtle"
          title="Сменить тему оформления"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-neutral-200" /> : <Moon className="w-4 h-4 text-neutral-800" />}
        </button>
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        <div className="glass-panel rounded-xl p-6 sm:p-8 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 shadow-elevated relative overflow-hidden">
          
          {/* VIEW: LOGIN */}
          {mode === 'login' && (
            <div>
              <div className="text-left mb-6">
                <h1 className="text-xl font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900 tracking-tight">
                  Авторизация в системе
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Закрытый корпоративный портал Electrodrivers
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{loginError}</div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-700 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="user@electrodrivers.ru"
                      required
                      className="glass-input w-full pl-10 pr-4 py-2.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 placeholder-neutral-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-700">
                      Пароль
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot_password')}
                      className="text-[11px] text-neutral-400 hover:text-white transition-colors"
                    >
                      Забыли пароль?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="glass-input w-full pl-10 pr-10 py-2.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 placeholder-neutral-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 py-2.5 px-4 rounded-lg font-medium text-xs text-black bg-white hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Проверка учетных данных...</span>
                  ) : (
                    <>
                      <span>Войти в систему</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-neutral-800 dark:border-neutral-800 light:border-neutral-200 text-center">
                <p className="text-xs text-neutral-400">
                  Нет аккаунта?{' '}
                  <button
                    onClick={() => {
                      setMode('register');
                      setRegError(null);
                    }}
                    className="text-white hover:underline font-medium transition-colors"
                  >
                    Подать заявку на регистрацию
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* VIEW: REGISTER */}
          {mode === 'register' && (
            <div>
              <div className="text-left mb-6">
                <h1 className="text-xl font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900 tracking-tight">
                  Подача заявки на регистрацию
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Заполните форму для рассмотрения учетной записи администратором
                </p>
              </div>

              {regError && (
                <div className="mb-4 p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                  <div>{regError}</div>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-700 mb-1">
                    ФИО
                  </label>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Иван Иванов"
                    className="glass-input w-full px-3 py-2 rounded-lg text-xs text-neutral-100 placeholder-neutral-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="user@electrodrivers.ru"
                    required
                    className="glass-input w-full px-3 py-2 rounded-lg text-xs text-neutral-100 placeholder-neutral-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-700 mb-1">
                    Никнейм в Telegram *
                  </label>
                  <div className="relative">
                    <Send className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regTelegram}
                      onChange={(e) => setRegTelegram(e.target.value)}
                      placeholder="@telegram_handle"
                      required
                      className="glass-input w-full pl-8 pr-3 py-2 rounded-lg text-xs text-neutral-100 placeholder-neutral-600 outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-700 mb-1">
                    Пароль *
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    required
                    className="glass-input w-full px-3 py-2 rounded-lg text-xs text-neutral-100 placeholder-neutral-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-700 mb-1">
                    Подтверждение пароля *
                  </label>
                  <input
                    type="password"
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    placeholder="Повторите пароль"
                    required
                    className="glass-input w-full px-3 py-2 rounded-lg text-xs text-neutral-100 placeholder-neutral-600 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-3 py-2.5 px-4 rounded-lg font-medium text-xs text-black bg-white hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? 'Отправка заявки...' : 'Отправить заявку'}
                </button>
              </form>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginError(null);
                  }}
                  className="text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  ← Назад к авторизации
                </button>
              </div>
            </div>
          )}

          {/* VIEW: PENDING NOTICE */}
          {mode === 'pending_notice' && (
            <div className="text-left py-2 animate-in fade-in duration-200">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center mb-4 text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>

              <h2 className="text-lg font-semibold text-neutral-100 mb-2">
                Заявка отправлена
              </h2>

              <p className="text-xs text-neutral-300 leading-relaxed mb-6">
                Заявка отправлена. Ожидайте подтверждения администратором. Проверьте вашу почту.
              </p>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full py-2 px-4 rounded-lg text-xs font-medium text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 transition-colors"
              >
                Вернуться к экрану входа
              </button>
            </div>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {mode === 'forgot_password' && (
            <div>
              <div className="text-left mb-6">
                <h1 className="text-lg font-semibold text-neutral-100">
                  Восстановление доступа
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Введите рабочий email для отправки ссылки сброса пароля
                </p>
              </div>

              {forgotSent ? (
                <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs space-y-3">
                  <p>Инструкция по восстановлению пароля выслана на указанный email.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotSent(false);
                      setMode('login');
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-white text-black text-xs font-medium hover:bg-neutral-200 transition-colors"
                  >
                    Вернуться ко входу
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="user@electrodrivers.ru"
                      required
                      className="glass-input w-full px-3 py-2 rounded-lg text-xs text-neutral-100 placeholder-neutral-600 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg text-xs font-medium text-black bg-white hover:bg-neutral-200 transition-all"
                  >
                    Отправить ссылку
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-xs text-neutral-400 hover:text-white transition-colors"
                    >
                      ← Отмена
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-4 text-center text-[11px] text-neutral-500 font-mono">
        Electrodrivers SaaS • Closed Corporate Portal
      </footer>
    </div>
  );
}
