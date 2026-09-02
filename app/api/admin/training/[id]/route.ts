import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAdmin } from '@/lib/auth';
import { updateOnboardingStep, deleteOnboardingStep } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = getSessionFromRequest(req);
    if (!actor || !isAdmin(actor)) {
      return NextResponse.json({ error: 'Недостаточно прав. Требуется роль Admin или SuperAdmin' }, { status: 403 });
    }

    const body = await req.json();
    const step = updateOnboardingStep(params.id, body, actor);
    return NextResponse.json({ step });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ошибка обновления шага' }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = getSessionFromRequest(req);
    if (!actor || !isAdmin(actor)) {
      return NextResponse.json({ error: 'Недостаточно прав. Требуется роль Admin или SuperAdmin' }, { status: 403 });
    }

    deleteOnboardingStep(params.id, actor);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ошибка удаления шага' }, { status: 400 });
  }
}
