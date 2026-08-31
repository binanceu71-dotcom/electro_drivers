'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { OnboardingStep, UserOnboardingProgress } from '@/lib/types';
import { Check, BookOpen, ArrowRight, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [progress, setProgress] = useState<UserOnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStep, setUpdatingStep] = useState<string | null>(null);

  const fetchOnboarding = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding');
      if (res.ok) {
        const data = await res.json();
        setSteps(data.steps || []);
        setProgress(data.progress || null);
      }
    } catch (err) {
      toast.error('Ошибка загрузки онбординга');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboarding();
  }, []);

  const handleToggleStep = async (stepId: string) => {
    setUpdatingStep(stepId);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_id: stepId })
      });
      const data = await res.json();
      if (res.ok) {
        setProgress(data.progress);
        const isDone = data.progress.completed_step_ids.includes(stepId);
        toast.success(isDone ? 'Шаг выполнен' : 'Отметка снята');
      }
    } catch (err) {
      toast.error('Сбой сервера');
    } finally {
      setUpdatingStep(null);
    }
  };

  if (authLoading || (loading && steps.length === 0)) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const completedCount = progress?.completed_step_ids.length || 0;
  const totalCount = steps.length || 4;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in duration-150">
      {/* Header */}
      <div className="pb-3 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
        <h1 className="text-lg font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900 tracking-tight">
          Онбординг участников
        </h1>
        <p className="text-xs text-neutral-400 dark:text-neutral-400 light:text-neutral-600 mt-0.5">
          Обязательные этапы ввода в регламенты и технические стандарты
        </p>
      </div>

      {/* Progress */}
      <div className="glass-panel rounded-xl p-4 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 shadow-subtle space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-300 dark:text-neutral-300 light:text-neutral-700">
            Выполнено шагов: <strong>{completedCount} из {totalCount}</strong>
          </span>
          <span className="font-mono text-neutral-200 dark:text-neutral-200 light:text-neutral-900 font-bold">{percentage}%</span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-200 overflow-hidden">
          <div
            className="h-full bg-white dark:bg-white light:bg-black transition-all duration-300 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step) => {
          const isDone = progress?.completed_step_ids.includes(step.id);
          const isBusy = updatingStep === step.id;

          return (
            <div
              key={step.id}
              className={`glass-panel rounded-xl p-3.5 border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDone
                  ? 'border-neutral-700 dark:border-neutral-700 light:border-neutral-300 bg-neutral-900/40 dark:bg-neutral-900/40 light:bg-neutral-100'
                  : 'border-neutral-800 dark:border-neutral-800 light:border-neutral-200 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  onClick={() => handleToggleStep(step.id)}
                  disabled={isBusy}
                  className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    isDone
                      ? 'bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white border-white dark:border-white light:border-black'
                      : 'border-neutral-600 dark:border-neutral-600 light:border-neutral-400 hover:border-white text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase">
                      Шаг {step.order} • {step.category}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      ~{step.duration_minutes} мин
                    </span>
                  </div>

                  <div className={`text-xs font-medium ${isDone ? 'line-through text-neutral-500' : 'text-neutral-200 dark:text-neutral-200 light:text-neutral-900'}`}>
                    {step.title}
                  </div>

                  <p className="text-[11px] text-neutral-400 dark:text-neutral-400 light:text-neutral-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                {step.article_id && (
                  <Link
                    href={`/app/knowledge-base?article=${step.article_id}`}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-neutral-300 dark:text-neutral-300 light:text-neutral-800 text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Регламент</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}

                <button
                  onClick={() => handleToggleStep(step.id)}
                  disabled={isBusy}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isDone
                      ? 'bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-200 text-neutral-400 dark:text-neutral-400 light:text-neutral-700 border border-neutral-800'
                      : 'bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white hover:bg-neutral-200'
                  }`}
                >
                  {isDone ? 'Снять' : 'Завершить'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
