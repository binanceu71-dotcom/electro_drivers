import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isActiveUser, isAdmin } from '@/lib/auth';
import { getAllArticles, createArticle, getArticlesBySpace } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isActiveUser(user)) {
      return NextResponse.json({ error: 'Доступ ограничен активным пользователям' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get('space_id');
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');

    let articles = spaceId ? getArticlesBySpace(spaceId) : getAllArticles();

    if (tag) {
      articles = articles.filter(a => a.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
    }

    if (search) {
      const q = search.toLowerCase();
      articles = articles.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.content.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({ articles });
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
    const { space_id, title, content, excerpt, tags, is_pinned, parent_id } = body;

    if (!space_id || !title || !content) {
      return NextResponse.json({ error: 'Заполните обязательные поля: Пространство, Заголовок, Содержание' }, { status: 400 });
    }

    const article = createArticle({
      space_id,
      title,
      content,
      excerpt,
      tags: Array.isArray(tags) ? tags : [],
      is_pinned: Boolean(is_pinned),
      parent_id: parent_id || null
    }, user);

    return NextResponse.json({ article }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
