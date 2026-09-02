import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isSuperAdmin, isAdmin } from '@/lib/auth';
import { updateUserRole, updateUserStatus, updateUserTraining, deleteUser, findUserById } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = getSessionFromRequest(req);
    if (!actor || !isAdmin(actor)) {
      return NextResponse.json({ error: 'Доступ запрещен. Требуются права администратора' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { role, status, stage, attestation_retake_enabled } = body;

    // Роль и статус может менять только SuperAdmin
    if ((role || status) && !isSuperAdmin(actor)) {
      return NextResponse.json({ error: 'Изменение роли и статуса доступно только SuperAdmin' }, { status: 403 });
    }

    const target = findUserById(id);
    if (!target) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Protect master superadmin from demoting/blocking self
    if (target.id === actor.id && (status === 'blocked' || (role && role !== 'superadmin'))) {
      return NextResponse.json({ error: 'Нельзя заблокировать или понизить свою учетную запись' }, { status: 400 });
    }

    let updated: any = target;
    if (status) {
      updated = updateUserStatus(id, status, actor) as any;
    }
    if (role) {
      updated = updateUserRole(id, role, actor) as any;
    }

    // «Повышение» (онбординг -> аттестация) и режим пересдачи — доступно admin и superadmin
    if (stage !== undefined || attestation_retake_enabled !== undefined) {
      if (stage !== undefined && stage !== 'onboarding' && stage !== 'attestation') {
        return NextResponse.json({ error: 'Недопустимое значение stage' }, { status: 400 });
      }
      updated = updateUserTraining(id, {
        stage,
        attestation_retake_enabled: attestation_retake_enabled === undefined ? undefined : Boolean(attestation_retake_enabled)
      }, actor);
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ошибка обновления пользователя' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = getSessionFromRequest(req);
    if (!actor || !isSuperAdmin(actor)) {
      return NextResponse.json({ error: 'Доступ запрещен. Только для SuperAdmin' }, { status: 403 });
    }

    const { id } = params;
    if (id === actor.id) {
      return NextResponse.json({ error: 'Нельзя удалить собственного пользователя' }, { status: 400 });
    }

    deleteUser(id, actor);
    return NextResponse.json({ success: true, message: 'Пользователь успешно удален' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ошибка удаления' }, { status: 500 });
  }
}
