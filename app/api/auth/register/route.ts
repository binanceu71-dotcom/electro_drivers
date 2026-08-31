import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createUser } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 registration requests per 10 minutes per IP
    const rl = checkRateLimit(req, { limit: 5, windowSec: 600, identifier: 'register' });
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Слишком много запросов на регистрацию. Пожалуйста, попробуйте позже.' },
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
    const { email, password, telegram_nickname, full_name } = body;

    if (!email || !password || !telegram_nickname) {
      return NextResponse.json({ error: 'Заполните обязательные поля: Email, Пароль, Никнейм в Telegram' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Некорректный формат email адреса' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Пароль должен содержать не менее 8 символов для безопасности' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = findUserByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json({ error: 'Пользователь с таким email уже зарегистрирован' }, { status: 409 });
    }

    let cleanTelegram = telegram_nickname.trim();
    if (!cleanTelegram.startsWith('@')) {
      cleanTelegram = `@${cleanTelegram}`;
    }

    // Salted PBKDF2 hash
    const secureHash = hashPassword(password);

    const newUser = createUser({
      email: cleanEmail,
      password_hash: secureHash,
      telegram_nickname: cleanTelegram,
      full_name: full_name?.trim() || cleanTelegram,
      role: 'user',
      status: 'pending'
    });

    return NextResponse.json({
      success: true,
      message: 'Заявка отправлена. Ожидайте подтверждения администратором. Проверьте вашу почту.',
      user: newUser
    }, {
      status: 201,
      headers: {
        'X-RateLimit-Limit': String(rl.limit),
        'X-RateLimit-Remaining': String(rl.remaining),
        'X-RateLimit-Reset': String(rl.reset)
      }
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
