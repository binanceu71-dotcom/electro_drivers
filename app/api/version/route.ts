import { NextResponse } from 'next/server';
import buildInfo from '@/lib/build-info.json';

export const dynamic = 'force-dynamic';

/**
 * GET /api/version — отпечаток текущей сборки.
 *
 * Используется для проверки, что прод реально обновился после деплоя:
 *   curl -s https://portal.electrodrivers.ru/api/version
 * Если buildTime/buildId не изменились после деплоя — вы смотрите на старую
 * сборку (кэш CDN, незаребилженный образ, старый процесс).
 */
export async function GET() {
  return NextResponse.json(
    {
      ...buildInfo,
      serverTime: new Date().toISOString(),
      node: process.version,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
