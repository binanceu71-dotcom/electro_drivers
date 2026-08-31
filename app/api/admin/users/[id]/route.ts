import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isSuperAdmin } from '@/lib/auth';
import { updateUserRole, updateUserStatus, deleteUser, findUserById } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = getSessionFromRequest(req);
    if (!actor || !isSuperAdmin(actor)) {
      return NextResponse.json({ error: 'Доступ запрещен. Только для SuperAdmin' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { role, status } = body;

    const target = findUserById(id);
    if (!target) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Protect master superadmin from demoting/blocking self
    if (target.id === actor.id && (status === 'blocked' || (role && role !== 'superadmin'))) {
      return NextResponse.json({ error: 'Нельзя заблокировать или понизить свою учетную запись' }, { status: 400 });
    }

    let updated = target;
    if (status) {
      updated = updateUserStatus(id, status, actor) as any;
    }
    if (role) {
      updated = updateUserRole(id, role, actor) as any;
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
