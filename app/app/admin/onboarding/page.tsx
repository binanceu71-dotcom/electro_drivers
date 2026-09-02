'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { OnboardingStep, QuizQuestion, TrainingTrack } from '@/lib/types';
import { isAdmin } from '@/lib/auth-helpers';
import {
  Loader2, Plus, Trash2, Pencil, X, GraduationCap,
  ClipboardCheck, Users, ChevronUp, RotateCcw, BookOpen
} from 'lucide-react';

interface ArticleRef { id: string; title: string; }

interface TrainingUser {
  id: string;
  email: string;
  full_name?: string;
  telegram_nickname: string;
  role: string;
  status: string;
  stage: TrainingTrack;
  attestation_retake_enabled: boolean;
  progress_completed: number;
  progress_total: number;
}

const EMPTY_QUESTION = (): QuizQuestion => ({
  id: '',
  text: '',
  options: ['', ''],
  correct_index: 0
});

export default function TrainingAdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [users, setUsers] = useState<TrainingUser[]>([]);
  const [articles, setArticles] = useState<ArticleRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'onboarding' | 'attestation' | 'users'>('onboarding');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [fTitle, setFTitle] = useState('');
  const [fDescription, setFDescription] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fArticleId, setFArticleId] = useState('');
  const [fDuration, setFDuration] = useState(10);
  const [fTrack, setFTrack] = useState<TrainingTrack>('onboarding');
  const [fPassScore, setFPassScore] = useState(1);
  const [fQuestions, setFQuestions] = useState<QuizQuestion[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/training');
      if (!res.ok) {
        if (res.status === 403) {
          toast.error('Доступ запрещен', 'Требуются права администратора');
          router.replace('/app/knowledge-base');
          return;
        }
        throw new Error('Ошибка загрузки');
      }
      const data = await res.json();
      setSteps(data.steps || []);
      setUsers(data.users || []);
      setArticles(data.articles || []);
    } catch {
      toast.error('Ошибка сервера');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      if (!isAdmin(user)) {
        toast.error('Доступ ограничен', 'Страница доступна только администраторам');
        router.replace('/app/knowledge-base');
      } else {
        fetchData();
      }
    }
  }, [user, authLoading]);

  const openEditor = (step?: OnboardingStep, track?: TrainingTrack) => {
    if (step) {
      setEditingStepId(step.id);
      setFTitle(step.title);
      setFDescription(step.description);
      setFCategory(step.category);
      setFArticleId(step.article_id || '');
      setFDuration(step.duration_minutes);
      setFTrack(step.track || 'onboarding');
      setFQuestions(JSON.parse(JSON.stringify(step.questions || [])));
      setFPassScore(step.pass_score || (step.questions || []).length || 1);
    } else {
      setEditingStepId(null);
      setFTitle('');
      setFDescription('');
      setFCategory(track === 'attestation' ? 'Аттестация' : 'Общее');
      setFArticleId('');
      setFDuration(10);
      setFTrack(track || 'onboarding');
      setFQuestions([]);
      setFPassScore(1);
    }
    setEditorOpen(true);
  };

  const handleSaveStep = async () => {
    if (!fTitle.trim()) {
      toast.error('Укажите название шага');
      return;
    }
    for (const q of fQuestions) {
      if (!q.text.trim()) { toast.error('У каждого вопроса должен быть текст'); return; }
      if (q.options.filter(o => o.trim()).length < 2) { toast.error('У вопроса минимум 2 варианта ответа'); return; }
      if (!q.options[q.correct_index] || !q.options[q.correct_index].trim()) {
        toast.error('Отметьте правильный вариант у каждого вопроса'); return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        title: fTitle.trim(),
        description: fDescription,
        category: fCategory || 'Общее',
        article_id: fArticleId || null,
        duration_minutes: fDuration,
        track: fTrack,
        questions: fQuestions,
        pass_score: fPassScore
      };
      const res = await fetch(editingStepId ? `/api/admin/training/${editingStepId}` : '/api/admin/training', {
        method: editingStepId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editingStepId ? 'Шаг обновлен' : 'Шаг создан');
        setEditorOpen(false);
        fetchData();
      } else {
        toast.error(data.error || 'Ошибка сохранения');
      }
    } catch {
      toast.error('Сбой сервера');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async (step: OnboardingStep) => {
    if (!window.confirm(`Удалить шаг "${step.title}"? Прогресс участников по нему будет сброшен.`)) return;
    setBusyId(step.id);
    try {
      const res = await fetch(`/api/admin/training/${step.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Шаг удален');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Ошибка удаления');
      }
    } catch {
      toast.error('Сбой сервера');
    } finally {
      setBusyId(null);
    }
  };

  const handleUserTraining = async (u: TrainingUser, updates: { stage?: TrainingTrack; attestation_retake_enabled?: boolean }) => {
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          updates.stage === 'attestation' ? 'Пользователь повышен до аттестации'
          : updates.stage === 'onboarding' ? 'Пользователь возвращен на онбординг'
          : updates.attestation_retake_enabled ? 'Пересдача разрешена'
          : 'Пересдача запрещена'
        );
        fetchData();
      } else {
        toast.error(data.error || 'Ошибка обновления');
      }
    } catch {
      toast.error('Сбой сервера');
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const trackSteps = steps
    .filter(s => (s.track || 'onboarding') === (activeTab === 'users' ? 'onboarding' : activeTab))
    .sort((a, b) => a.order - b.order);

  const tabBtn = (id: 'onboarding' | 'attestation' | 'users', label: string, Icon: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
        activeTab === id
          ? 'bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white'
          : 'bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-black border border-neutral-800 dark:border-neutral-800 light:border-neutral-200'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* Header */}
      <div className="pb-3 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900 tracking-tight">
            Управление обучением
          </h1>
          <p className="text-xs text-neutral-400 dark:text-neutral-400 light:text-neutral-600 mt-0.5">
            Конструктор шагов онбординга и аттестации, тесты и повышение участников
          </p>
        </div>
        {activeTab !== 'users' && (
          <button
            onClick={() => openEditor(undefined, activeTab)}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white hover:bg-neutral-200 text-xs font-semibold transition-colors flex items-center gap-1.5 self-start"
          >
            <Plus className="w-3.5 h-3.5" />
            Новый шаг
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabBtn('onboarding', 'Онбординг', ClipboardCheck)}
        {tabBtn('attestation', 'Аттестация', GraduationCap)}
        {tabBtn('users', 'Участники', Users)}
      </div>

      {/* ======== STEPS LIST ======== */}
      {activeTab !== 'users' && (
        <div className="space-y-2">
          {trackSteps.length === 0 && (
            <div className="glass-panel rounded-xl p-6 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 text-center text-xs text-neutral-400">
              Шагов пока нет. Создайте первый шаг.
            </div>
          )}
          {trackSteps.map(step => {
            const qCount = (step.questions || []).length;
            return (
              <div
                key={step.id}
                className="glass-panel rounded-xl p-3.5 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase">
                      Шаг {step.order} • {step.category} • ~{step.duration_minutes} мин
                    </span>
                    {qCount > 0 ? (
                      <span className="text-[10px] font-mono px-1.5 rounded border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-400 uppercase">
                        Тест: {qCount} вопр. / порог {step.pass_score || qCount}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 rounded border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-neutral-500 uppercase">
                        Без теста
                      </span>
                    )}
                    {step.article_id && (
                      <span className="text-[10px] font-mono px-1.5 rounded border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-neutral-500 uppercase flex items-center gap-1">
                        <BookOpen className="w-2.5 h-2.5" />
                        Статья
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-900">
                    {step.title}
                  </div>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-400 light:text-neutral-600">
                    {step.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <button
                    onClick={() => openEditor(step)}
                    className="p-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-neutral-300 dark:text-neutral-300 light:text-neutral-700 transition-colors"
                    title="Редактировать"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteStep(step)}
                    disabled={busyId === step.id}
                    className="p-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-black transition-colors"
                    title="Удалить"
                  >
                    {busyId === step.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======== USERS ======== */}
      {activeTab === 'users' && (
        <div className="space-y-2">
          {users.map(u => (
            <div
              key={u.id}
              className="glass-panel rounded-xl p-3.5 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-900 truncate">
                    {u.full_name || u.telegram_nickname}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 rounded border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-400 uppercase">
                    {u.stage === 'attestation' ? 'Аттестация' : 'Онбординг'}
                  </span>
                  {u.stage === 'attestation' && u.attestation_retake_enabled && (
                    <span className="text-[10px] font-mono px-1.5 rounded border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-400 uppercase">
                      Пересдача разрешена
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-500 truncate">
                  {u.email} • {u.telegram_nickname} • роль: {u.role}
                </div>
                <div className="text-[11px] text-neutral-400">
                  Прогресс: {u.progress_completed}/{u.progress_total} шагов
                  {u.progress_total > 0 && u.progress_completed === u.progress_total && ' — завершено'}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
                {u.stage === 'onboarding' ? (
                  <button
                    onClick={() => handleUserTraining(u, { stage: 'attestation' })}
                    disabled={busyId === u.id}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white hover:bg-neutral-200 text-xs font-medium transition-colors flex items-center gap-1"
                    title="Перевести на аттестацию"
                  >
                    <ChevronUp className="w-3 h-3" />
                    Повысить
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleUserTraining(u, { attestation_retake_enabled: !u.attestation_retake_enabled })}
                      disabled={busyId === u.id}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border ${
                        u.attestation_retake_enabled
                          ? 'bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-200 text-neutral-300 dark:text-neutral-300 light:text-neutral-800 border-neutral-700'
                          : 'bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white border-transparent hover:bg-neutral-200'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      {u.attestation_retake_enabled ? 'Запретить пересдачу' : 'Разрешить пересдачу'}
                    </button>
                    <button
                      onClick={() => handleUserTraining(u, { stage: 'onboarding' })}
                      disabled={busyId === u.id}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-neutral-400 text-xs font-medium transition-colors"
                    >
                      Вернуть в онбординг
                    </button>
                  </>
                )}
                {busyId === u.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======== STEP EDITOR MODAL ======== */}
      {editorOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setEditorOpen(false)}>
          <div
            className="glass-panel max-w-2xl w-full max-h-[85vh] overflow-y-auto p-5 rounded-xl border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 shadow-elevated space-y-4 bg-black dark:bg-black light:bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900">
                {editingStepId ? 'Редактирование шага' : 'Новый шаг'}
              </h2>
              <button onClick={() => setEditorOpen(false)} className="text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-black p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] text-neutral-400 uppercase font-mono">Название *</label>
                <input
                  value={fTitle}
                  onChange={e => setFTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 outline-none focus:border-neutral-500"
                  placeholder="Например: Изучение регламента допуска"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] text-neutral-400 uppercase font-mono">Описание</label>
                <textarea
                  value={fDescription}
                  onChange={e => setFDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 outline-none focus:border-neutral-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-neutral-400 uppercase font-mono">Трек</label>
                <select
                  value={fTrack}
                  onChange={e => setFTrack(e.target.value as TrainingTrack)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 outline-none"
                >
                  <option value="onboarding">Онбординг</option>
                  <option value="attestation">Аттестация</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-neutral-400 uppercase font-mono">Категория</label>
                <input
                  value={fCategory}
                  onChange={e => setFCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 outline-none focus:border-neutral-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-neutral-400 uppercase font-mono">Статья (открывается перед тестом)</label>
                <select
                  value={fArticleId}
                  onChange={e => setFArticleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 outline-none"
                >
                  <option value="">— Без статьи —</option>
                  {articles.map(a => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-neutral-400 uppercase font-mono">Длительность, мин</label>
                <input
                  type="number"
                  min={1}
                  value={fDuration}
                  onChange={e => setFDuration(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 outline-none focus:border-neutral-500"
                />
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-3 pt-2 border-t border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-neutral-200 dark:text-neutral-200 light:text-neutral-900">
                    Вопросы теста ({fQuestions.length})
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Без вопросов шаг завершается вручную. С вопросами — только успешной сдачей теста.
                  </p>
                </div>
                <button
                  onClick={() => setFQuestions(prev => [...prev, EMPTY_QUESTION()])}
                  className="px-2.5 py-1 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-neutral-300 dark:text-neutral-300 light:text-neutral-800 text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Вопрос
                </button>
              </div>

              {fQuestions.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-neutral-400 uppercase font-mono">
                    Порог сдачи (правильных ответов):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={fQuestions.length}
                    value={Math.min(fPassScore, fQuestions.length)}
                    onChange={e => setFPassScore(Number(e.target.value) || 1)}
                    className="w-16 px-2 py-1 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 outline-none text-center"
                  />
                  <span className="text-[11px] text-neutral-500">из {fQuestions.length}</span>
                </div>
              )}

              {fQuestions.map((q, qi) => (
                <div key={qi} className="rounded-xl p-3 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 space-y-2 bg-neutral-950/50 dark:bg-neutral-950/50 light:bg-neutral-50">
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] font-mono text-neutral-500 mt-2">{qi + 1}.</span>
                    <input
                      value={q.text}
                      onChange={e => setFQuestions(prev => prev.map((x, i) => i === qi ? { ...x, text: e.target.value } : x))}
                      placeholder="Текст вопроса"
                      className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 outline-none focus:border-neutral-500"
                    />
                    <button
                      onClick={() => setFQuestions(prev => prev.filter((_, i) => i !== qi))}
                      className="p-1.5 text-neutral-500 hover:text-white dark:hover:text-white light:hover:text-black transition-colors"
                      title="Удалить вопрос"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 pl-5">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          onClick={() => setFQuestions(prev => prev.map((x, i) => i === qi ? { ...x, correct_index: oi } : x))}
                          className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-colors ${
                            q.correct_index === oi
                              ? 'border-white dark:border-white light:border-black'
                              : 'border-neutral-600 hover:border-neutral-400'
                          }`}
                          title="Отметить как правильный"
                        >
                          {q.correct_index === oi && <span className="w-2 h-2 rounded-full bg-white dark:bg-white light:bg-black" />}
                        </button>
                        <input
                          value={opt}
                          onChange={e => setFQuestions(prev => prev.map((x, i) =>
                            i === qi ? { ...x, options: x.options.map((o, j) => j === oi ? e.target.value : o) } : x
                          ))}
                          placeholder={`Вариант ${oi + 1}`}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-xs text-neutral-100 dark:text-neutral-100 light:text-neutral-900 outline-none focus:border-neutral-500"
                        />
                        {q.options.length > 2 && (
                          <button
                            onClick={() => setFQuestions(prev => prev.map((x, i) =>
                              i === qi ? {
                                ...x,
                                options: x.options.filter((_, j) => j !== oi),
                                correct_index: x.correct_index === oi ? 0 : x.correct_index > oi ? x.correct_index - 1 : x.correct_index
                              } : x
                            ))}
                            className="p-1 text-neutral-600 hover:text-white dark:hover:text-white light:hover:text-black transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setFQuestions(prev => prev.map((x, i) => i === qi ? { ...x, options: [...x.options, ''] } : x))}
                      className="text-[11px] text-neutral-500 hover:text-white dark:hover:text-white light:hover:text-black transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Добавить вариант
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
              <button
                onClick={() => setEditorOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-800 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveStep}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white hover:bg-neutral-200 text-xs font-semibold transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingStepId ? 'Сохранить' : 'Создать шаг'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
