import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAdmin } from '@/lib/auth';
import { getOnboardingSteps, createOnboardingStep, getAllUsers, getAllArticles, getDb } from '@/lib/db';

/**
 * Управление обучением (онбординг + аттестация).
 * Доступ: admin / superadmin.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = getSessionFromRequest(req);
    if (!actor || !isAdmin(actor)) {
      return NextResponse.json({ error: 'Недостаточно прав. Требуется роль Admin или SuperAdmin' }, { status: 403 });
    }

    // Полные шаги (с правильными ответами) — только для админов
    const steps = getOnboardingSteps();
    const articles = getAllArticles().map(a => ({ id: a.id, title: a.title, space_id: a.space_id }));

    // Участники с их прогрессом
    const db = getDb();
    const users = getAllUsers().map(u => {
      const prog = db.user_progress[u.id];
      const track = u.stage || 'onboarding';
      const trackSteps = steps.filter(s => (s.track || 'onboarding') === track);
      const completed = trackSteps.filter(s => prog?.completed_step_ids.includes(s.id)).length;
      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        telegram_nickname: u.telegram_nickname,
        role: u.role,
        status: u.status,
        stage: track,
        attestation_retake_enabled: !!u.attestation_retake_enabled,
        progress_completed: completed,
        progress_total: trackSteps.length
      };
    });

    return NextResponse.json({ steps, users, articles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = getSessionFromRequest(req);
    if (!actor || !isAdmin(actor)) {
      return NextResponse.json({ error: 'Недостаточно прав. Требуется роль Admin или SuperAdmin' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.title || !String(body.title).trim()) {
      return NextResponse.json({ error: 'Название шага обязательно' }, { status: 400 });
    }

    const step = createOnboardingStep({
      title: String(body.title).trim(),
      description: body.description,
      category: body.category,
      article_id: body.article_id,
      duration_minutes: body.duration_minutes,
      track: body.track,
      questions: body.questions,
      pass_score: body.pass_score
    }, actor);

    return NextResponse.json({ step }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ошибка создания шага' }, { status: 500 });
  }
}
