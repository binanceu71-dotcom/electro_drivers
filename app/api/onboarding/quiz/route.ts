import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isActiveUser } from '@/lib/auth';
import { submitQuizAttempt } from '@/lib/db';

/**
 * Сдача теста по шагу онбординга/аттестации.
 * Body: { step_id: string, answers: Record<questionId, optionIndex> }
 */
export async function POST(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isActiveUser(user)) {
      return NextResponse.json({ error: 'Доступ ограничен активным пользователям' }, { status: 401 });
    }

    const body = await req.json();
    const { step_id, answers } = body;

    if (!step_id || !answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'step_id и answers обязательны' }, { status: 400 });
    }

    const result = submitQuizAttempt(user, step_id, answers);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ошибка проверки теста' }, { status: 400 });
  }
}
