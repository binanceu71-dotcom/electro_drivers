import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAdmin } from '@/lib/auth';
import { deleteSpace } from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Недостаточно прав. Требуется роль Admin или SuperAdmin' }, { status: 403 });
    }

    const force = req.nextUrl.searchParams.get('force') === '1';
    const result = deleteSpace(params.id, force, user);
    return NextResponse.json({ success: true, deleted_articles: result.deleted_articles });
  } catch (error: any) {
    if (error?.code === 'SPACE_NOT_EMPTY') {
      return NextResponse.json(
        { error: error.message, code: 'SPACE_NOT_EMPTY', articles_count: error.articles_count },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message || 'Ошибка удаления пространства' }, { status: 500 });
  }
}
