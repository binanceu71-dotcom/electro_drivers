import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isActiveUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isActiveUser(user)) {
      return NextResponse.json({ error: 'Доступ ограничен авторизованным пользователям' }, { status: 401 });
    }

    return NextResponse.json({
      status: 'ready',
      gateway: 'MQTT/TLS 1.3',
      csms: 'OCPP 2.0.1',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
