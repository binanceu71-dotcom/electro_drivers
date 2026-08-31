'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [telegram, setTelegram] = useState(user?.telegram_nickname || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (newPassword && newPassword !== newPasswordConfirm) {
      toast.error('Пароли не совпадают');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          telegram_nickname: telegram.trim(),
          current_password: currentPassword || undefined,
          new_password: newPassword || undefined,
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Настройки сохранены');
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
        refreshUser();
      } else {
        toast.error('Ошибка', data.error);
      }
    } catch (err) {
      toast.error('Сбой сервера');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto animate-in fade-in duration-150">
      <div className="pb-3 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
        <h1 className="text-lg font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900 tracking-tight">
          Настройки профиля
        </h1>
        <p className="text-xs text-neutral-400 dark:text-neutral-400 light:text-neutral-600 mt-0.5">
          Управление учетными данными и безопасностью
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div className="glass-panel rounded-xl p-5 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 space-y-3">
          <div className="text-xs font-semibold text-neutral-200 dark:text-neutral-200 light:text-neutral-900">
            Основная информация
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-400 dark:text-neutral-400 light:text-neutral-700 mb-1">
                ФИО
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Иван Иванов"
                className="glass-input w-full px-3 py-1.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 dark:text-neutral-400 light:text-neutral-700 mb-1">
                Telegram никнейм
              </label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="@username"
                required
                className="glass-input w-full px-3 py-1.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 dark:text-neutral-400 light:text-neutral-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="glass-input w-full px-3 py-1.5 rounded-lg text-xs text-neutral-500 bg-neutral-900/40 dark:bg-neutral-900/40 light:bg-neutral-100 outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 dark:text-neutral-400 light:text-neutral-700 mb-1">
                Уровень доступа (Роль)
              </label>
              <div className="text-xs font-mono uppercase text-neutral-300 dark:text-neutral-300 light:text-neutral-800">
                {user.role} ({user.status})
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-5 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 space-y-3">
          <div className="text-xs font-semibold text-neutral-200 dark:text-neutral-200 light:text-neutral-900">
            Смена пароля
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-400 dark:text-neutral-400 light:text-neutral-700 mb-1">
                Текущий пароль
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-input w-full px-3 py-1.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 dark:text-neutral-400 light:text-neutral-700 mb-1">
                Новый пароль
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Мин. 6 символов"
                className="glass-input w-full px-3 py-1.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 dark:text-neutral-400 light:text-neutral-700 mb-1">
                Подтверждение
              </label>
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                placeholder="Повтор пароля"
                className="glass-input w-full px-3 py-1.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-medium text-black dark:text-black light:text-white bg-white dark:bg-white light:bg-black hover:bg-neutral-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Сохранение...' : 'Сохранить изменения'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
