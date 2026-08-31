import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isActiveUser, isAdmin } from '@/lib/auth';
import { getArticleById, updateArticle, deleteArticle, incrementArticleViews } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isActiveUser(user)) {
      return NextResponse.json({ error: 'Доступ ограничен активным пользователям' }, { status: 401 });
    }

    const { id } = params;
    const article = getArticleById(id);
    if (!article) {
      return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
    }

    // Increment views asynchronously
    incrementArticleViews(id);

    return NextResponse.json({ article });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Недостаточно прав. Требуется роль Admin или SuperAdmin' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();

    const updated = updateArticle(id, body, user);
    return NextResponse.json({ article: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Недостаточно прав. Требуется роль Admin или SuperAdmin' }, { status: 403 });
    }

    const { id } = params;
    deleteArticle(id, user);

    return NextResponse.json({ success: true, message: 'Статья удалена' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
