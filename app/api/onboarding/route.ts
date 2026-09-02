import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isActiveUser } from '@/lib/auth';
import { getOnboardingSteps, getUserOnboardingProgress, toggleOnboardingStep } from '@/lib/db';
import { OnboardingStep } from '@/lib/types';

/** Убираем правильные ответы перед отправкой участнику */
function sanitizeStep(step: OnboardingStep) {
  return {
    ...step,
    questions: (step.questions || []).map(({ correct_index, ...q }) => q),
    has_quiz: (step.questions || []).length > 0,
    questions_count: (step.questions || []).length
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isActiveUser(user)) {
      return NextResponse.json({ error: 'Доступ ограничен активным пользователям' }, { status: 401 });
    }

    const track = (user.stage || 'onboarding') === 'attestation' ? 'attestation' : 'onboarding';
    const steps = getOnboardingSteps(track).map(sanitizeStep);
    const progress = getUserOnboardingProgress(user.id);

    return NextResponse.json({
      steps,
      progress,
      track,
      attestation_retake_enabled: !!user.attestation_retake_enabled
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isActiveUser(user)) {
      return NextResponse.json({ error: 'Доступ ограничен активным пользователям' }, { status: 401 });
    }

    const body = await req.json();
    const { step_id } = body;

    if (!step_id) {
      return NextResponse.json({ error: 'step_id обязателен' }, { status: 400 });
    }

    const updatedProgress = toggleOnboardingStep(user.id, step_id);
    return NextResponse.json({ progress: updatedProgress });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
