'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { UserProfile, AuditLog } from '@/lib/types';
import { isSuperAdmin } from '@/lib/auth-helpers';
import { 
  Shield, Search, Clock, 
  Trash2, RefreshCw, Copy, Check, Loader2
} from 'lucide-react';

export default function AdminPanelPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'sql'>('users');
  const [sqlCopied, setSqlCopied] = useState(false);

  const SUPABASE_SCHEMA_PREVIEW = `-- Electrodrivers PostgreSQL / Supabase Schema

create type user_role as enum ('user', 'admin', 'superadmin');
create type user_status as enum ('pending', 'active', 'blocked');

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  telegram_nickname text not null,
  role user_role not null default 'user',
  status user_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Admins Read All Profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin') and status = 'active'
    )
  );

create policy "SuperAdmin Update Profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'superadmin' and status = 'active'
    )
  );`;

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        if (res.status === 403) {
          toast.error('Доступ запрещен', 'Требуются права Администратора');
          router.replace('/app/knowledge-base');
          return;
        }
        throw new Error('Ошибка загрузки данных');
      }
      const data = await res.json();
      setUsers(data.users || []);
      setStats(data.stats || {});
      setAuditLogs(data.auditLogs || []);
    } catch (err) {
      toast.error('Ошибка сервера');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        if (!isSuperAdmin(user)) {
          toast.error('Доступ ограничен', 'Страница доступна только Администраторам');
          router.replace('/app/knowledge-base');
        } else {
          fetchAdminData();
        }
      }
    }
  }, [user, authLoading]);

  if (authLoading || (loading && !stats)) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const handleUpdateStatus = async (userId: string, newStatus: 'pending' | 'active' | 'blocked') => {
    setActionInProgress(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(newStatus === 'active' ? 'Пользователь активирован' : 'Статус обновлен');
        fetchAdminData();
      } else {
        toast.error('Ошибка', data.error);
      }
    } catch (err) {
      toast.error('Сбой сервера');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'user' | 'admin' | 'superadmin') => {
    setActionInProgress(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Роль обновлена: ${newRole.toUpperCase()}`);
        fetchAdminData();
      } else {
        toast.error('Ошибка', data.error);
      }
    } catch (err) {
      toast.error('Сбой сервера');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Удалить пользователя ${email}?`)) return;

    setActionInProgress(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Пользователь удален');
        fetchAdminData();
      } else {
        toast.error('Ошибка', data.error);
      }
    } catch (err) {
      toast.error('Сбой сервера');
    } finally {
      setActionInProgress(null);
    }
  };

  const copySqlSchema = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_PREVIEW);
    setSqlCopied(true);
    toast.success('SQL схема скопирована');
    setTimeout(() => setSqlCopied(false), 3000);
  };

  const filteredUsers = users.filter(u => {
    const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesQuery = !searchQuery || 
      u.email.toLowerCase().includes(q) || 
      u.telegram_nickname.toLowerCase().includes(q) ||
      (u.full_name && u.full_name.toLowerCase().includes(q));
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
        <div>
          <h1 className="text-lg font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900 tracking-tight">
            Администрирование пользователей
          </h1>
          <p className="text-xs text-neutral-400 dark:text-neutral-400 light:text-neutral-600 mt-0.5">
            Модерация регистраций, назначение ролей и аудит
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-300 dark:text-neutral-300 light:text-neutral-800 transition-colors flex items-center gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Обновить</span>
        </button>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-panel p-3.5 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
            <div className="text-[10px] uppercase font-mono text-neutral-500">Всего аккаунтов</div>
            <div className="text-xl font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900 mt-1">{stats.totalUsers}</div>
          </div>

          <div className="glass-panel p-3.5 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
            <div className="text-[10px] uppercase font-mono text-neutral-400 dark:text-neutral-400 light:text-neutral-600">На модерации (Pending)</div>
            <div className="text-xl font-semibold text-white dark:text-white light:text-black mt-1">{stats.pendingCount}</div>
          </div>

          <div className="glass-panel p-3.5 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
            <div className="text-[10px] uppercase font-mono text-neutral-500">Активные (Active)</div>
            <div className="text-xl font-semibold text-neutral-200 dark:text-neutral-200 light:text-neutral-800 mt-1">{stats.activeCount}</div>
          </div>

          <div className="glass-panel p-3.5 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
            <div className="text-[10px] uppercase font-mono text-neutral-500">Администраторы</div>
            <div className="text-xl font-semibold text-neutral-200 dark:text-neutral-200 light:text-neutral-800 mt-1">{stats.adminCount}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200 pb-1 text-xs">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'users'
              ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-200 text-white dark:text-white light:text-black font-semibold'
              : 'text-neutral-400 dark:text-neutral-400 light:text-neutral-600 hover:text-white dark:hover:text-white light:hover:text-black'
          }`}
        >
          Пользователи ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'audit'
              ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-200 text-white dark:text-white light:text-black font-semibold'
              : 'text-neutral-400 dark:text-neutral-400 light:text-neutral-600 hover:text-white dark:hover:text-white light:hover:text-black'
          }`}
        >
          Журнал аудита
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'sql'
              ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-200 text-white dark:text-white light:text-black font-semibold'
              : 'text-neutral-400 dark:text-neutral-400 light:text-neutral-600 hover:text-white dark:hover:text-white light:hover:text-black'
          }`}
        >
          Supabase SQL
        </button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          <div className="glass-panel p-3 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по email или Telegram..."
                className="glass-input w-full pl-8 pr-3 py-1.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 placeholder-neutral-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto text-xs">
              {[
                { key: 'all', label: 'Все' },
                { key: 'pending', label: 'Pending' },
                { key: 'active', label: 'Active' },
                { key: 'blocked', label: 'Blocked' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterStatus(f.key)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    filterStatus === f.key
                      ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-300 text-white dark:text-white light:text-black font-semibold'
                      : 'text-neutral-400 dark:text-neutral-400 light:text-neutral-600 hover:text-white dark:hover:text-white light:hover:text-black'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 overflow-hidden shadow-subtle">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 text-neutral-400 dark:text-neutral-400 light:text-neutral-700 uppercase font-mono border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
                  <tr>
                    <th className="p-3">Email / Пользователь</th>
                    <th className="p-3">Telegram</th>
                    <th className="p-3">Роль</th>
                    <th className="p-3">Статус</th>
                    <th className="p-3">Дата</th>
                    <th className="p-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 dark:divide-neutral-800 light:divide-neutral-200">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === user?.id || u.email === user?.email;
                    const isBusy = actionInProgress === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-neutral-900/40 dark:hover:bg-neutral-900/40 light:hover:bg-neutral-100 transition-colors">
                        <td className="p-3">
                          <div className="font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-900">{u.full_name || u.email}</div>
                          <div className="text-[11px] text-neutral-500 font-mono">{u.email}</div>
                        </td>

                        <td className="p-3 font-mono text-neutral-300 dark:text-neutral-300 light:text-neutral-700">
                          {u.telegram_nickname}
                        </td>

                        <td className="p-3">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 text-neutral-300 dark:text-neutral-300 light:text-neutral-800">
                            {u.role}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
                            u.status === 'active'
                              ? 'border-neutral-700 dark:border-neutral-700 light:border-neutral-300 bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 text-neutral-200 dark:text-neutral-200 light:text-neutral-800'
                              : u.status === 'pending'
                              ? 'border-white dark:border-white light:border-black text-white dark:text-white light:text-black font-bold bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-200'
                              : 'border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-neutral-500'
                          }`}>
                            {u.status}
                          </span>
                        </td>

                        <td className="p-3 text-neutral-500 font-mono text-[11px]">
                          {new Date(u.created_at).toLocaleDateString('ru-RU')}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateStatus(u.id, 'active')}
                                disabled={isBusy}
                                className="px-2.5 py-1 rounded bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white font-semibold text-xs transition-colors"
                              >
                                Активировать
                              </button>
                            )}

                            {!isSelf && u.role === 'user' && (
                              <button
                                onClick={() => handleUpdateRole(u.id, 'admin')}
                                disabled={isBusy}
                                className="px-2 py-1 rounded bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-300 dark:text-neutral-300 light:text-neutral-800 text-xs transition-colors"
                              >
                                + Сделать Admin
                              </button>
                            )}

                            {!isSelf && u.role === 'admin' && (
                              <button
                                onClick={() => handleUpdateRole(u.id, 'user')}
                                disabled={isBusy}
                                className="px-2 py-1 rounded bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-400 dark:text-neutral-400 light:text-neutral-600 text-xs transition-colors"
                              >
                                Понизить
                              </button>
                            )}

                            {!isSelf && u.status === 'active' && (
                              <button
                                onClick={() => handleUpdateStatus(u.id, 'blocked')}
                                disabled={isBusy}
                                className="px-2 py-1 rounded bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 text-neutral-400 dark:text-neutral-400 light:text-neutral-600 text-xs transition-colors"
                              >
                                Заблокировать
                              </button>
                            )}

                            {!isSelf && u.status === 'blocked' && (
                              <button
                                onClick={() => handleUpdateStatus(u.id, 'active')}
                                disabled={isBusy}
                                className="px-2 py-1 rounded bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 text-neutral-200 dark:text-neutral-200 light:text-neutral-800 text-xs transition-colors"
                              >
                                Разблокировать
                              </button>
                            )}

                            {!isSelf && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                disabled={isBusy}
                                className="p-1 rounded text-neutral-500 hover:text-white dark:hover:text-white light:hover:text-black transition-colors"
                                title="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="glass-panel rounded-lg p-4 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 shadow-subtle space-y-3">
          <div className="text-xs font-semibold text-neutral-200 dark:text-neutral-200 light:text-neutral-900 pb-2 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
            События безопасности и журнала аудита
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded bg-neutral-900/60 dark:bg-neutral-900/60 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 flex items-start justify-between gap-4 text-xs font-mono"
              >
                <div>
                  <div className="text-neutral-200 dark:text-neutral-200 light:text-neutral-900">{log.details}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    Инициатор: {log.actor_telegram} ({log.actor_email})
                  </div>
                </div>
                <div className="text-[10px] text-neutral-500 shrink-0">
                  {new Date(log.created_at).toLocaleTimeString('ru-RU')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SQL */}
      {activeTab === 'sql' && (
        <div className="glass-panel rounded-lg p-4 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 shadow-subtle space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
            <div className="text-xs font-semibold text-neutral-200 dark:text-neutral-200 light:text-neutral-900">
              Supabase / PostgreSQL DDL & RLS Policies
            </div>
            <button
              onClick={copySqlSchema}
              className="px-2.5 py-1 rounded bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white text-xs font-medium flex items-center gap-1 transition-colors"
            >
              {sqlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{sqlCopied ? 'Скопировано' : 'Скопировать SQL'}</span>
            </button>
          </div>

          <pre className="p-3 rounded bg-neutral-950 dark:bg-neutral-950 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 font-mono text-xs text-neutral-300 dark:text-neutral-300 light:text-neutral-800 overflow-x-auto max-h-[400px]">
            <code>{SUPABASE_SCHEMA_PREVIEW}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
