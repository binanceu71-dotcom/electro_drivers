import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAdmin } from '@/lib/auth';
import { getReportById, updateReportStatus, deleteReport } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Доступ ограничен' }, { status: 403 });
    }

    const { id } = params;
    const report = getReportById(id);
    if (!report) {
      return NextResponse.json({ error: 'Отчет не найден' }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Доступ ограничен' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { status, review_comment } = body;

    if (!status) {
      return NextResponse.json({ error: 'Статус обязателен' }, { status: 400 });
    }

    const updated = updateReportStatus(id, status, review_comment, user);
    return NextResponse.json({ success: true, report: updated });
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
      return NextResponse.json({ error: 'Доступ ограничен' }, { status: 403 });
    }

    const { id } = params;
    deleteReport(id, user);

    return NextResponse.json({ success: true, message: 'Отчет удален' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
