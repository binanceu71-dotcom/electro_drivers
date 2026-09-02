import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isActiveUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  ogv: 'video/ogg',
};

export async function GET(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isActiveUser(user)) {
      return NextResponse.json({ error: 'Доступ ограничен' }, { status: 401 });
    }

    // Защита от выхода за пределы каталога
    const name = path.basename(params.name);
    if (!/^[\w.-]+$/.test(name)) {
      return NextResponse.json({ error: 'Некорректное имя файла' }, { status: 400 });
    }

    const filePath = path.join(UPLOADS_DIR, name);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
    }

    const ext = name.split('.').pop()?.toLowerCase() || '';
    const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
    const stat = fs.statSync(filePath);

    // Поддержка Range-запросов для перемотки видео
    const range = req.headers.get('range');
    if (range && mime.startsWith('video/')) {
      const match = range.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 4 * 1024 * 1024, stat.size - 1);
        const chunk = fs.createReadStream(filePath, { start, end });
        return new NextResponse(chunk as any, {
          status: 206,
          headers: {
            'Content-Type': mime,
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(end - start + 1),
            'Cache-Control': 'private, max-age=31536000, immutable',
          },
        });
      }
    }

    const stream = fs.createReadStream(filePath);
    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(stat.size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ошибка чтения файла' }, { status: 500 });
  }
}
