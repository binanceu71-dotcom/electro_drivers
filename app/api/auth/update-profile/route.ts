import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, verifyPassword, hashPassword } from '@/lib/auth';
import { updateUserProfile, findUserById, saveDb, getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const body = await req.json();
    const { full_name, telegram_nickname, current_password, new_password } = body;

    // Handle password change if requested
    if (new_password) {
      if (!current_password) {
        return NextResponse.json({ error: 'Укажите текущий пароль для смены' }, { status: 400 });
      }
      if (new_password.length < 8) {
        return NextResponse.json({ error: 'Новый пароль должен содержать минимум 8 символов для безопасности' }, { status: 400 });
      }
      const rawUser = findUserById(user.id);
      if (!rawUser || !verifyPassword(current_password, rawUser.password_hash)) {
        return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 400 });
      }

      const db = getDb();
      const u = db.users.find(x => x.id === user.id);
      if (u) {
        u.password_hash = hashPassword(new_password);
        saveDb(db);
      }
    }

    const updated = updateUserProfile(user.id, {
      full_name,
      telegram_nickname
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Ошибка обновления' }, { status: 500 });
  }
}
