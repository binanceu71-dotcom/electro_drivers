import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAdmin } from '@/lib/auth';
import { getAllReports, createReport } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Доступ разрешен только Администраторам' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    let reports = getAllReports();

    if (status && status !== 'all') {
      reports = reports.filter(r => r.status === status);
    }

    if (type && type !== 'all') {
      reports = reports.filter(r => r.report_type === type);
    }

    if (search) {
      const q = search.toLowerCase();
      reports = reports.filter(r => 
        r.employee_name.toLowerCase().includes(q) || 
        r.telegram_username.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ reports });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Доступ разрешен только Администраторам' }, { status: 403 });
    }

    const body = await req.json();
    const { telegram_username, employee_name, report_type, title, shift_date, metrics, notes, attachments } = body;

    if (!telegram_username) {
      return NextResponse.json({ error: 'Укажите никнейм в Telegram' }, { status: 400 });
    }

    const report = createReport({
      telegram_username,
      employee_name,
      report_type,
      title,
      shift_date,
      metrics,
      notes,
      attachments,
      raw_payload: body
    });

    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
