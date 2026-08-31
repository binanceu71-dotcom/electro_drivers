import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isActiveUser, isAdmin } from '@/lib/auth';
import { getAllSpaces, createSpace } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isActiveUser(user)) {
      return NextResponse.json({ error: 'Доступ ограничен авторизованным пользователям' }, { status: 401 });
    }

    const spaces = getAllSpaces();
    return NextResponse.json({ spaces });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Недостаточно прав. Требуется роль Admin или SuperAdmin' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Название пространства обязательно' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-zа-я0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const space = createSpace({
      name,
      slug: `${slug}-${Math.random().toString(36).substring(2, 5)}`,
      description: description || '',
      order: 10
    }, user);

    return NextResponse.json({ space }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
