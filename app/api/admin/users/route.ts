import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isSuperAdmin } from '@/lib/auth';
import { getAllUsers, getAllArticles, getAllSpaces, getAuditLogs } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const actor = getSessionFromRequest(req);
    if (!actor || !isSuperAdmin(actor)) {
      return NextResponse.json({ error: 'Доступ запрещен. Требуются права SuperAdmin' }, { status: 403 });
    }

    const users = getAllUsers();
    const articles = getAllArticles();
    const spaces = getAllSpaces();
    const logs = getAuditLogs();

    const stats = {
      totalUsers: users.length,
      pendingCount: users.filter(u => u.status === 'pending').length,
      activeCount: users.filter(u => u.status === 'active').length,
      blockedCount: users.filter(u => u.status === 'blocked').length,
      adminCount: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
      articlesCount: articles.length,
      spacesCount: spaces.length,
    };

    return NextResponse.json({
      users,
      stats,
      auditLogs: logs.slice(0, 20)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
