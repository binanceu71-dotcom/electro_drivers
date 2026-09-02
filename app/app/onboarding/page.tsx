'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { StepQuizState, UserOnboardingProgress } from '@/lib/types';
import { Check, BookOpen, ArrowRight, Loader2, X, Lock, RotateCcw, GraduationCap, ClipboardCheck } from 'lucide-react';

interface PublicQuestion {
  id: string;
  text: string;
  options: string[];
}

interface PublicStep {
  id: string;
  title: string;
  description: string;
  category: string;
  article_id?: string;
  order: number;
  duration_minutes: number;
  track?: 'onboarding' | 'attestation';
  questions: PublicQuestion[];
  has_quiz: boolean;
  questions_count: number;
  pass_score?: number;
}

interface QuizResult {
  passed: boolean;
  score_total: number;
  pass_score: number;
  questions_total: number;
  wrong_question_ids: string[];
  retake_available: boolean;
}

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [steps, setSteps] = useState<PublicStep[]>([]);
  const [progress, setProgress] = useState<UserOnboardingProgress | null>(null);
  const [track, setTrack] = useState<'onboarding' | 'attestation'>('onboarding');
  const [retakeEnabled, setRetakeEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingStep, setUpdatingStep] = useState<string | null>(null);

  // Quiz modal state
  const [quizStep, setQuizStep] = useState<PublicStep | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  const isAttestation = track === 'attestation';

  const fetchOnboarding = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding');
      if (res.ok) {
        const data = await res.json();
        setSteps(data.steps || []);
        setProgress(data.progress || null);
        setTrack(data.track === 'attestation' ? 'attestation' : 'onboarding');
        setRetakeEnabled(!!data.attestation_retake_enabled);
      }
    } catch (err) {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboarding();
  }, []);

  const getQuizState = (stepId: string): StepQuizState | undefined =>
    progress?.quiz_states?.[stepId];

  const handleToggleManualStep = async (stepId: string) => {
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
      } else {
        toast.error(data.error || 'Не удалось обновить шаг');
      }
    } catch (err) {
      toast.error('Сбой сервера');
    } finally {
      setUpdatingStep(null);
    }
  };

  const openQuiz = (step: PublicStep) => {
    const state = getQuizState(step.id);
    // Пересдача — только вопросы, отвеченные неверно в прошлой попытке
    const isRetake = !!state && state.attempts > 0 && !state.passed;
    let questionsToAsk = isRetake
      ? step.questions.filter(q => state!.pending_question_ids.includes(q.id))
      : step.questions;
    // Если вопросы изменились после прошлой попытки — спрашиваем всё, что не отвечено правильно
    if (isRetake && questionsToAsk.length === 0) {
      questionsToAsk = step.questions.filter(q => !state!.correct_question_ids.includes(q.id));
    }
    if (questionsToAsk.length === 0) questionsToAsk = step.questions;

    setQuizStep(step);
    setQuizQuestions(questionsToAsk);
    setAnswers({});
    setResult(null);
  };

  const closeQuiz = () => {
    setQuizStep(null);
    setQuizQuestions([]);
    setAnswers({});
    setResult(null);
  };

  const handleSubmitQuiz = async () => {
    if (!quizStep) return;
    if (quizQuestions.some(q => answers[q.id] === undefined)) {
      toast.error('Ответьте на все вопросы');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/onboarding/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_id: quizStep.id, answers })
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setProgress(data.progress);
        if (data.passed) {
          toast.success('Тест успешно сдан');
        }
      } else {
        toast.error(data.error || 'Ошибка проверки теста');
      }
    } catch (err) {
      toast.error('Сбой сервера');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetakeNow = () => {
    if (!quizStep || !result) return;
    const wrongIds = result.wrong_question_ids;
    setQuizQuestions(quizStep.questions.filter(q => wrongIds.includes(q.id)));
    setAnswers({});
    setResult(null);
  };

  if (authLoading || (loading && steps.length === 0)) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const completedCount = steps.filter(s => progress?.completed_step_ids.includes(s.id)).length;
  const totalCount = steps.length || 1;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in duration-150">
      {/* Header */}
      <div className="pb-3 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 flex items-center justify-center">
          {isAttestation
            ? <GraduationCap className="w-4 h-4 text-neutral-300 dark:text-neutral-300 light:text-neutral-700" />
            : <ClipboardCheck className="w-4 h-4 text-neutral-300 dark:text-neutral-300 light:text-neutral-700" />}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900 tracking-tight">
            {isAttestation ? 'Аттестация' : 'Онбординг участников'}
          </h1>
          <p className="text-xs text-neutral-400 dark:text-neutral-400 light:text-neutral-600 mt-0.5">
            {isAttestation
              ? 'Итоговая проверка знаний. Пересдача — только по решению администратора.'
              : 'Изучите статью по каждому шагу и подтвердите знания тестом'}
          </p>
        </div>
      </div>

      {isAttestation && retakeEnabled && (
        <div className="rounded-xl px-4 py-2.5 border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 bg-neutral-900/60 dark:bg-neutral-900/60 light:bg-neutral-100 text-xs text-neutral-300 dark:text-neutral-300 light:text-neutral-700 flex items-center gap-2">
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          Администратор разрешил вам пересдачу аттестации.
        </div>
      )}

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
        {steps.length === 0 && (
          <div className="glass-panel rounded-xl p-6 border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 text-center text-xs text-neutral-400">
            {isAttestation ? 'Шаги аттестации пока не настроены администратором.' : 'Шаги онбординга пока не настроены.'}
          </div>
        )}

        {steps.map((step) => {
          const isDone = progress?.completed_step_ids.includes(step.id);
          const isBusy = updatingStep === step.id;
          const quizState = getQuizState(step.id);
          const hasFailedAttempt = !!quizState && quizState.attempts > 0 && !quizState.passed;
          const retakeBlocked = hasFailedAttempt && isAttestation && !retakeEnabled;
          const passScore = step.pass_score || step.questions_count;

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
                <div
                  className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center ${
                    isDone
                      ? 'bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white border-white dark:border-white light:border-black'
                      : 'border-neutral-600 dark:border-neutral-600 light:border-neutral-400 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase">
                      Шаг {step.order} • {step.category}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      ~{step.duration_minutes} мин
                    </span>
                    {step.has_quiz && (
                      <span className="text-[10px] font-mono px-1.5 rounded border border-neutral-700 dark:border-neutral-700 light:border-neutral-300 text-neutral-400 uppercase">
                        Тест: {step.questions_count} вопр. / порог {passScore}
                      </span>
                    )}
                  </div>

                  <div className={`text-xs font-medium ${isDone ? 'line-through text-neutral-500' : 'text-neutral-200 dark:text-neutral-200 light:text-neutral-900'}`}>
                    {step.title}
                  </div>

                  <p className="text-[11px] text-neutral-400 dark:text-neutral-400 light:text-neutral-600 leading-relaxed">
                    {step.description}
                  </p>

                  {hasFailedAttempt && (
                    <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                      {retakeBlocked && <Lock className="w-3 h-3" />}
                      Последняя попытка: {quizState!.last_score}/{step.questions_count} (порог {passScore}).{' '}
                      {retakeBlocked
                        ? 'Пересдача — только по решению администратора.'
                        : `К пересдаче: ${quizState!.pending_question_ids.length} вопрос(ов), отвеченных неверно.`}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                {step.article_id && (
                  <a
                    href={`/app/knowledge-base?article=${step.article_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-800 light:hover:bg-neutral-200 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-neutral-300 dark:text-neutral-300 light:text-neutral-800 text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Статья</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                )}

                {step.has_quiz ? (
                  isDone ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-200 text-neutral-400 dark:text-neutral-400 light:text-neutral-700 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300">
                      Тест сдан
                    </span>
                  ) : retakeBlocked ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-200 text-neutral-500 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Не сдано
                    </span>
                  ) : (
                    <button
                      onClick={() => openQuiz(step)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white hover:bg-neutral-200 flex items-center gap-1"
                    >
                      {hasFailedAttempt && <RotateCcw className="w-3 h-3" />}
                      {hasFailedAttempt ? 'Пересдать тест' : 'Пройти тест'}
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => handleToggleManualStep(step.id)}
                    disabled={isBusy}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      isDone
                        ? 'bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-200 text-neutral-400 dark:text-neutral-400 light:text-neutral-700 border border-neutral-800'
                        : 'bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white hover:bg-neutral-200'
                    }`}
                  >
                    {isDone ? 'Снять' : 'Завершить'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============ QUIZ MODAL ============ */}
      {quizStep && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={closeQuiz}>
          <div
            className="glass-panel max-w-2xl w-full max-h-[85vh] overflow-y-auto p-5 rounded-xl border border-neutral-800 dark:border-neutral-800 light:border-neutral-200 shadow-elevated space-y-4 bg-black dark:bg-black light:bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono text-neutral-500 uppercase mb-0.5">
                  {isAttestation ? 'Аттестация' : 'Онбординг'} • Тест
                </div>
                <h2 className="text-sm font-semibold text-neutral-100 dark:text-neutral-100 light:text-neutral-900">
                  {quizStep.title}
                </h2>
                {!result && (
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Вопросов в попытке: {quizQuestions.length}.
                    {' '}Для сдачи нужно {quizStep.pass_score || quizStep.questions_count} правильных из {quizStep.questions_count}.
                  </p>
                )}
              </div>
              <button onClick={closeQuiz} className="text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-black p-1 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {result ? (
              /* ---------- Результат ---------- */
              <div className="space-y-4">
                <div className={`rounded-xl p-4 border text-center space-y-1.5 ${
                  result.passed
                    ? 'border-neutral-600 bg-neutral-900/60 dark:bg-neutral-900/60 light:bg-neutral-100'
                    : 'border-neutral-800 bg-neutral-950 dark:bg-neutral-950 light:bg-neutral-50'
                }`}>
                  <div className="text-2xl font-bold font-mono text-neutral-100 dark:text-neutral-100 light:text-neutral-900">
                    {result.score_total}/{result.questions_total}
                  </div>
                  <div className="text-xs text-neutral-400">
                    Порог сдачи: {result.pass_score} правильных
                  </div>
                  <div className={`text-sm font-semibold ${result.passed ? 'text-white dark:text-white light:text-black' : 'text-neutral-400'}`}>
                    {result.passed ? 'Тест успешно сдан' : 'Тест не сдан'}
                  </div>
                  {!result.passed && (
                    <p className="text-[11px] text-neutral-500">
                      Неверных ответов: {result.wrong_question_ids.length}.{' '}
                      {result.retake_available
                        ? 'При пересдаче нужно ответить только на них.'
                        : 'Пересдача аттестации возможна только по решению администратора.'}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={closeQuiz}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 hover:bg-neutral-800 border border-neutral-800 dark:border-neutral-800 light:border-neutral-300 text-xs font-medium text-neutral-300 dark:text-neutral-300 light:text-neutral-800 transition-colors"
                  >
                    Закрыть
                  </button>
                  {!result.passed && result.retake_available && (
                    <button
                      onClick={handleRetakeNow}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white hover:bg-neutral-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Пересдать сейчас ({result.wrong_question_ids.length} вопр.)
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* ---------- Вопросы ---------- */
              <div className="space-y-4">
                {quizQuestions.map((q, qi) => (
                  <div key={q.id} className="space-y-2">
                    <div className="text-xs font-medium text-neutral-200 dark:text-neutral-200 light:text-neutral-900">
                      <span className="font-mono text-neutral-500 mr-1.5">{qi + 1}.</span>
                      {q.text}
                    </div>
                    <div className="space-y-1">
                      {q.options.map((opt, oi) => (
                        <label
                          key={oi}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-xs ${
                            answers[q.id] === oi
                              ? 'border-white dark:border-white light:border-black bg-neutral-900 dark:bg-neutral-900 light:bg-neutral-100 text-white dark:text-white light:text-black font-medium'
                              : 'border-neutral-800 dark:border-neutral-800 light:border-neutral-200 text-neutral-400 hover:border-neutral-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            className="hidden"
                            checked={answers[q.id] === oi}
                            onChange={() => setAnswers(prev => ({ ...prev, [q.id]: oi }))}
                          />
                          <span className={`w-3.5 h-3.5 rounded-full border shrink-0 flex items-center justify-center ${
                            answers[q.id] === oi ? 'border-white dark:border-white light:border-black' : 'border-neutral-600'
                          }`}>
                            {answers[q.id] === oi && <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-white light:bg-black" />}
                          </span>
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2 border-t border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
                  <span className="text-[11px] text-neutral-500">
                    Отвечено: {quizQuestions.filter(q => answers[q.id] !== undefined).length}/{quizQuestions.length}
                  </span>
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={submitting || quizQuestions.some(q => answers[q.id] === undefined)}
                    className="px-4 py-1.5 rounded-lg bg-white dark:bg-white light:bg-black text-black dark:text-black light:text-white hover:bg-neutral-200 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Завершить тест
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
