import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, saveDb, getDb } from '@/lib/db';
import { createSessionToken, AUTH_COOKIE_NAME, verifyPassword, hashPassword } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 login attempts per minute per IP
    const rl = checkRateLimit(req, { limit: 10, windowSec: 60, identifier: 'login' });
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Слишком много попыток входа. Пожалуйста, подождите минуту перед повторной попыткой.' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rl.reset - Math.floor(Date.now() / 1000)),
            'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rl.reset)
          }
        }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Пожалуйста, заполните все поля' }, { status: 400 });
    }

    const user = findUserByEmail(email.trim());
    if (!user) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
    }

    // Secure password verification
    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
    }

    // Check account status per ТЗ section 6.1
    if (user.status === 'pending') {
      return NextResponse.json({
        error: 'Аккаунт не активирован администратором. Ваша заявка находится на модерации.',
        status: 'pending'
      }, { status: 403 });
    }

    if (user.status === 'blocked') {
      return NextResponse.json({
        error: 'Доступ заблокирован администратором портала.',
        status: 'blocked'
      }, { status: 403 });
    }

    // Auto-upgrade legacy plain hash to salted PBKDF2 hash
    const db = getDb();
    const u = db.users.find(x => x.id === user.id);
    if (u) {
      u.last_login_at = new Date().toISOString();
      if (!u.password_hash.startsWith('pbkdf2$')) {
        u.password_hash = hashPassword(password);
      }
      saveDb(db);
    }

    const { password_hash, ...profile } = user;
    const token = createSessionToken(profile);

    const isProd = process.env.NODE_ENV === 'production';

    const response = NextResponse.json({
      success: true,
      user: profile,
      token
    }, {
      headers: {
        'X-RateLimit-Limit': String(rl.limit),
        'X-RateLimit-Remaining': String(rl.remaining),
        'X-RateLimit-Reset': String(rl.reset)
      }
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
      secure: isProd
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
