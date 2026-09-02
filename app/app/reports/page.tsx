'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { EmployeeReport, ReportStatus, ReportType } from '@/lib/types';
import { isAdmin } from '@/lib/auth-helpers';
import { safeCopyToClipboard } from '@/lib/clipboard';
import { 
  FileText, Search, Check, X, Clock, AlertTriangle, 
  RefreshCw, Plus, Send, Code, Image as ImageIcon, 
  Eye, CheckCircle2, XCircle, HelpCircle, Trash2,
  Filter, Terminal, Copy, ExternalLink, Loader2
} from 'lucide-react';

export default function ReportsCrmPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [reports, setReports] = useState<EmployeeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected report modal
  const [selectedReport, setSelectedReport] = useState<EmployeeReport | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Test Webhook modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testJson, setTestJson] = useState(`{
  "telegram_user_id": "7829104",
  "telegram_username": "@driver_sergey",
  "employee_name": "Сергей Николаев",
  "report_type": "shift_report",
  "shift_date": "${new Date().toISOString().split('T')[0]}",
  "title": "Отчет по смене #42",
  "metrics": {
    "hours_worked": 8.0,
    "mileage_km": 210.5,
    "kwh_charged": 42.0,
    "vehicle_plate": "Е777КХ 799"
  },
  "notes": "Маршрут пройден полностью. Зарядка на ультра-хабе CCS2 выполнена без ошибок.",
  "attachments": [
    {
      "type": "photo",
      "url": "https://images.unsplash.com/photo-1558441719-8b489c63f79b?w=800&auto=format&fit=crop&q=80",
      "caption": "Показания одометра и зарядной сессии"
    }
  ]
}`);

  // Webhook Docs tab
  const [activeView, setActiveView] = useState<'crm' | 'webhook_docs'>('crm');
  const [copiedCurl, setCopiedCurl] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm/reports');
      if (!res.ok) {
        if (res.status === 403) {
          toast.error('Доступ ограничен', 'CRM отчетов доступна только Администраторам');
          router.replace('/app/knowledge-base');
          return;
        }
        throw new Error('Ошибка загрузки отчетов');
      }
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      toast.error('Ошибка загрузки CRM');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin(user)) {
        toast.error('Доступ ограничен', 'Раздел доступен только Администраторам');
        router.replace('/app/knowledge-base');
      } else {
        fetchReports();
      }
    }
  }, [user, authLoading]);

  if (authLoading || (loading && reports.length === 0)) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const handleUpdateStatus = async (reportId: string, newStatus: ReportStatus) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/crm/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          review_comment: reviewComment.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Статус отчета обновлен');
        fetchReports();
        if (selectedReport?.id === reportId) {
          setSelectedReport(data.report);
        }
        setReviewComment('');
      } else {
        toast.error('Ошибка', data.error);
      }
    } catch (err) {
      toast.error('Сбой сервера');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Удалить данный отчет из CRM?')) return;

    try {
      const res = await fetch(`/api/crm/reports/${reportId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Отчет удален');
        setSelectedReport(null);
        fetchReports();
      } else {
        const data = await res.json();
        toast.error('Ошибка удаления', data.error);
      }
    } catch (err) {
      toast.error('Сбой сервера');
    }
  };

  const handleSendTestWebhook = async () => {
    try {
      const payload = JSON.parse(testJson);
      const res = await fetch('/api/crm/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Отчет успешно отправлен ботом и добавлен в CRM!');
        setShowTestModal(false);
        fetchReports();
      } else {
        toast.error('Ошибка вебхука', data.error);
      }
    } catch (err: any) {
      toast.error('Некорректный JSON', err.message);
    }
  };

  const copyWebhookCurl = async () => {
    const curlCode = `curl -X POST https://electrodrivers.ru/api/crm/webhook \\
  -H "Content-Type: application/json" \\
  -d '${testJson.replace(/\n/g, '').replace(/\s+/g, ' ')}'`;
    const ok = await safeCopyToClipboard(curlCode);
    if (ok) {
      setCopiedCurl(true);
      toast.success('cURL команда скопирована');
      setTimeout(() => setCopiedCurl(false), 3000);
    } else {
      toast.error('Не удалось скопировать', 'Скопируйте команду вручную');
    }
  };

  // Stats
  const totalReports = reports.length;
  const pendingCount = reports.filter(r => r.status === 'pending_review').length;
  const approvedCount = reports.filter(r => r.status === 'approved').length;
  const rejectedCount = reports.filter(r => r.status === 'rejected').length;

  // Filtered
  const filteredReports = reports.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesType = typeFilter === 'all' || r.report_type === typeFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery = !searchQuery || 
      r.employee_name.toLowerCase().includes(q) ||
      r.telegram_username.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.notes.toLowerCase().includes(q);
    return matchesStatus && matchesType && matchesQuery;
  });

  const getStatusBadge = (st: ReportStatus) => {
    switch (st) {
      case 'approved':
        return <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-neutral-200">Одобрен</span>;
      case 'rejected':
        return <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-neutral-400">Отклонен</span>;
      case 'needs_clarification':
        return <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-neutral-600 bg-neutral-850 text-neutral-300">Уточнение</span>;
      default:
        return <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-white text-white bg-neutral-900 font-bold">На проверке</span>;
    }
  };

  const getTypeLabel = (t: ReportType) => {
    switch (t) {
      case 'shift_report': return 'Смена';
      case 'incident_report': return 'Инцидент';
      case 'handover_report': return 'Прием/Передача';
      case 'financial_receipt': return 'Чек/Финансы';
      default: return 'Отчет';
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
        <div>
          <h1 className="text-lg font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900 tracking-tight">
            CRM отчетов сотрудников (Telegram Bot Webhook)
          </h1>
          <p className="text-xs text-neutral-400 dark:text-neutral-400 light:text-neutral-600 mt-0.5">
            Прием, парсинг JSON и модерация сменных отчетов из Telegram-бота
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setShowTestModal(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-300 dark:text-neutral-300 light:text-neutral-800 transition-colors flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Тест вебхука (JSON)</span>
          </button>

          <button
            onClick={fetchReports}
            className="p-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-300 dark:text-neutral-300 light:text-neutral-800 transition-colors"
            title="Обновить"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
          <div className="text-[10px] uppercase font-mono text-neutral-500">Всего отчетов</div>
          <div className="text-xl font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900 mt-1">{totalReports}</div>
        </div>

        <div className="glass-panel p-3.5 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
          <div className="text-[10px] uppercase font-mono text-neutral-400 dark:text-neutral-400 light:text-neutral-600">На проверке (Pending)</div>
          <div className="text-xl font-semibold text-white dark:text-white light:text-black mt-1">{pendingCount}</div>
        </div>

        <div className="glass-panel p-3.5 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
          <div className="text-[10px] uppercase font-mono text-neutral-500">Одобрено</div>
          <div className="text-xl font-semibold text-neutral-200 dark:text-neutral-200 light:text-neutral-800 mt-1">{approvedCount}</div>
        </div>

        <div className="glass-panel p-3.5 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
          <div className="text-[10px] uppercase font-mono text-neutral-500">Отклонено</div>
          <div className="text-xl font-semibold text-neutral-400 dark:text-neutral-400 light:text-neutral-600 mt-1">{rejectedCount}</div>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex items-center gap-2 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200 pb-1 text-xs">
        <button
          onClick={() => setActiveView('crm')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeView === 'crm'
              ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-200 text-white dark:text-white light:text-black font-semibold'
              : 'text-neutral-400 dark:text-neutral-400 light:text-neutral-600 hover:text-white dark:hover:text-white light:hover:text-black'
          }`}
        >
          Журнал отчетов ({filteredReports.length})
        </button>

        <button
          onClick={() => setActiveView('webhook_docs')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeView === 'webhook_docs'
              ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-200 text-white dark:text-white light:text-black font-semibold'
              : 'text-neutral-400 dark:text-neutral-400 light:text-neutral-600 hover:text-white dark:hover:text-white light:hover:text-black'
          }`}
        >
          Интеграция вебхука (API Docs)
        </button>
      </div>

      {/* VIEW 1: CRM REPORTS TABLE */}
      {activeView === 'crm' && (
        <div className="space-y-3">
          {/* Filters and search */}
          <div className="glass-panel p-3 rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по сотруднику, никнейму, тексту..."
                className="glass-input w-full pl-8 pr-3 py-1.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 placeholder-neutral-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
              <span className="text-[10px] uppercase font-mono text-neutral-500 mr-1 hidden sm:inline">Статус:</span>
              {[
                { key: 'all', label: 'Все' },
                { key: 'pending_review', label: 'На проверке' },
                { key: 'approved', label: 'Одобренные' },
                { key: 'rejected', label: 'Отклоненные' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                    statusFilter === f.key
                      ? 'bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-300 text-white dark:text-white light:text-black font-semibold'
                      : 'text-neutral-400 dark:text-neutral-400 light:text-neutral-600 hover:text-white dark:hover:text-white light:hover:text-black'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel rounded-lg border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 overflow-hidden shadow-subtle">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 text-neutral-400 dark:text-neutral-400 light:text-neutral-700 uppercase font-mono border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
                  <tr>
                    <th className="p-3">Сотрудник (Telegram)</th>
                    <th className="p-3">Тип / Заголовок</th>
                    <th className="p-3">Дата смены</th>
                    <th className="p-3">Ключевые метрики</th>
                    <th className="p-3">Статус</th>
                    <th className="p-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 dark:divide-neutral-800 light:divide-neutral-200">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-neutral-500">
                        Нет отчетов по выбранным фильтрам
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((r) => (
                      <tr 
                        key={r.id} 
                        className="hover:bg-neutral-900/40 dark:hover:bg-neutral-900/40 light:hover:bg-neutral-100 transition-colors cursor-pointer"
                        onClick={() => setSelectedReport(r)}
                      >
                        <td className="p-3">
                          <div className="font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-900">{r.employee_name}</div>
                          <div className="text-[11px] text-neutral-400 font-mono">{r.telegram_username}</div>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-200 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-neutral-400 dark:text-neutral-400 light:text-neutral-700">
                              {getTypeLabel(r.report_type)}
                            </span>
                            <span className="font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-900 truncate max-w-[200px]">{r.title}</span>
                          </div>
                          {r.attachments && r.attachments.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-neutral-500 mt-0.5">
                              <ImageIcon className="w-3 h-3" />
                              <span>{r.attachments.length} вложение(й)</span>
                            </div>
                          )}
                        </td>

                        <td className="p-3 font-mono text-neutral-400 dark:text-neutral-400 light:text-neutral-600">
                          {r.shift_date}
                        </td>

                        <td className="p-3">
                          <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-neutral-300 dark:text-neutral-300 light:text-neutral-700">
                            {r.metrics.hours_worked !== undefined && (
                              <span className="px-1.5 py-0.2 rounded bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
                                {r.metrics.hours_worked} ч
                              </span>
                            )}
                            {r.metrics.mileage_km !== undefined && (
                              <span className="px-1.5 py-0.2 rounded bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
                                {r.metrics.mileage_km} км
                              </span>
                            )}
                            {r.metrics.kwh_charged !== undefined && (
                              <span className="px-1.5 py-0.2 rounded bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
                                {r.metrics.kwh_charged} кВт·ч
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3">
                          {getStatusBadge(r.status)}
                        </td>

                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelectedReport(r)}
                              className="px-2 py-1 rounded bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-300 dark:text-neutral-300 light:text-neutral-800 text-xs transition-colors flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Открыть</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: WEBHOOK DOCUMENTATION */}
      {activeView === 'webhook_docs' && (
        <div className="glass-panel rounded-lg p-5 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900">
                Спецификация вебхука для Telegram-бота
              </h2>
              <p className="text-xs text-neutral-400 dark:text-neutral-400 light:text-neutral-600 mt-0.5">
                Эндпоинт принимает POST-запросы с JSON-пакетами отчетов и автоматически сохраняет их в CRM
              </p>
            </div>
            <button
              onClick={copyWebhookCurl}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedCurl ? 'Скопировано!' : 'Скопировать cURL'}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="font-mono text-neutral-400">URL эндпоинта:</span>
              <div className="p-2.5 rounded bg-neutral-950 dark:bg-neutral-950 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 font-mono text-neutral-200 dark:text-neutral-200 light:text-neutral-900 mt-1">
                POST /api/crm/webhook
              </div>
            </div>

            <div>
              <span className="font-mono text-neutral-400">Пример JSON тела запроса:</span>
              <pre className="p-3 rounded bg-neutral-950 dark:bg-neutral-950 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 font-mono text-neutral-300 dark:text-neutral-300 light:text-neutral-800 overflow-x-auto mt-1">
                <code>{testJson}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* REPORT INSPECTOR MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel max-w-2xl w-full p-5 rounded-xl border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 shadow-elevated space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-neutral-400">
                    {getTypeLabel(selectedReport.report_type)}
                  </span>
                  {getStatusBadge(selectedReport.status)}
                </div>
                <h2 className="text-base font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900 mt-1">
                  {selectedReport.title}
                </h2>
                <div className="text-xs text-neutral-400 dark:text-neutral-400 light:text-neutral-600 font-mono mt-0.5">
                  Сотрудник: <strong>{selectedReport.employee_name}</strong> ({selectedReport.telegram_username}) • Смена: {selectedReport.shift_date}
                </div>
              </div>

              <button
                onClick={() => setSelectedReport(null)}
                className="text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {Object.entries(selectedReport.metrics).map(([key, val]) => (
                <div key={key} className="p-2.5 rounded bg-neutral-900/60 dark:bg-neutral-900/60 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 font-mono">
                  <div className="text-[10px] text-neutral-500 uppercase">{key.replace('_', ' ')}</div>
                  <div className="font-semibold text-neutral-200 dark:text-neutral-200 light:text-neutral-900 mt-0.5">{String(val)}</div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300 dark:text-neutral-300 light:text-neutral-700">Текст отчета сотрудника:</label>
              <div className="p-3 rounded bg-neutral-900/60 dark:bg-neutral-900/60 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 text-xs text-neutral-200 dark:text-neutral-200 light:text-neutral-900 leading-relaxed whitespace-pre-wrap">
                {selectedReport.notes || 'Текстовый комментарий отсутствует'}
              </div>
            </div>

            {/* Attachments / Photos */}
            {selectedReport.attachments && selectedReport.attachments.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300 dark:text-neutral-300 light:text-neutral-700">Прикрепленные фото / вложения:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedReport.attachments.map((att, i) => (
                    <div key={i} className="rounded-lg overflow-hidden border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 bg-neutral-950">
                      {att.type === 'photo' && (
                        <img src={att.url} alt={att.caption || 'Вложение'} className="w-full h-40 object-cover" />
                      )}
                      {att.caption && (
                        <div className="p-2 text-[11px] text-neutral-400 font-mono border-t border-neutral-800">
                          {att.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review Comment input */}
            <div className="space-y-1 pt-2 border-t border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
              <label className="text-xs font-semibold text-neutral-300 dark:text-neutral-300 light:text-neutral-700">Комментарий модератора:</label>
              <input
                type="text"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Замечания, причина отклонения или подтверждение..."
                className="glass-input w-full px-3 py-1.5 rounded-lg text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 placeholder-neutral-500 outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                onClick={() => handleDeleteReport(selectedReport.id)}
                className="p-2 rounded text-neutral-500 hover:text-white dark:hover:text-white light:hover:text-black transition-colors"
                title="Удалить отчет"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleUpdateStatus(selectedReport.id, 'rejected')}
                  disabled={isUpdating}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 dark:text-neutral-300 light:text-neutral-800 transition-colors"
                >
                  Отклонить
                </button>

                <button
                  onClick={() => handleUpdateStatus(selectedReport.id, 'needs_clarification')}
                  disabled={isUpdating}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 dark:text-neutral-300 light:text-neutral-800 transition-colors"
                >
                  Запросить уточнение
                </button>

                <button
                  onClick={() => handleUpdateStatus(selectedReport.id, 'approved')}
                  disabled={isUpdating}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white hover:bg-neutral-200 transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Одобрить отчет</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WEBHOOK TEST SIMULATOR MODAL */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel max-w-xl w-full p-5 rounded-xl border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 shadow-elevated space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900">
                Эмулятор отправки отчета Telegram-ботом
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 dark:text-neutral-400 light:text-neutral-600">
              Отредактируйте JSON пакет и нажмите «Отправить», чтобы проверить парсер вебхука:
            </p>

            <textarea
              value={testJson}
              onChange={(e) => setTestJson(e.target.value)}
              rows={12}
              className="w-full p-3 rounded bg-neutral-950 dark:bg-neutral-950 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 font-mono text-xs text-neutral-200 dark:text-neutral-200 light:text-neutral-900 outline-none resize-none leading-relaxed"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSendTestWebhook}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white hover:bg-neutral-200 transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Отправить в вебхук</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
