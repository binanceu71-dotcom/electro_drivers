import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isActiveUser } from '@/lib/auth';
import { getOnboardingSteps, getUserOnboardingProgress, toggleOnboardingStep } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isActiveUser(user)) {
      return NextResponse.json({ error: 'Доступ ограничен активным пользователям' }, { status: 401 });
    }

    const steps = getOnboardingSteps();
    const progress = getUserOnboardingProgress(user.id);

    return NextResponse.json({ steps, progress });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
