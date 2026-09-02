import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAdmin } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

/**
 * Загрузка медиафайлов для статей (изображения, GIF, видео).
 * Файлы хранятся в data/uploads — этот каталог лежит в Docker-томе
 * и переживает пересоздание контейнера.
 */

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

const ALLOWED: Record<string, { ext: string; kind: 'image' | 'video' }> = {
  'image/png': { ext: 'png', kind: 'image' },
  'image/jpeg': { ext: 'jpg', kind: 'image' },
  'image/webp': { ext: 'webp', kind: 'image' },
  'image/gif': { ext: 'gif', kind: 'image' },
  'image/svg+xml': { ext: 'svg', kind: 'image' },
  'video/mp4': { ext: 'mp4', kind: 'video' },
  'video/webm': { ext: 'webm', kind: 'video' },
  'video/quicktime': { ext: 'mov', kind: 'video' },
  'video/ogg': { ext: 'ogv', kind: 'video' },
};

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;  // 15 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

export async function POST(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Загрузка файлов доступна только администраторам' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Файл не передан (поле file)' }, { status: 400 });
    }

    const meta = ALLOWED[file.type];
    if (!meta) {
      return NextResponse.json(
        { error: `Неподдерживаемый тип: ${file.type || 'неизвестно'}. Разрешены: PNG, JPG, WEBP, GIF, SVG, MP4, WEBM, MOV` },
        { status: 415 }
      );
    }

    const maxBytes = meta.kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `Файл слишком большой (${Math.round(file.size / 1024 / 1024)} МБ). Лимит: ${Math.round(maxBytes / 1024 / 1024)} МБ` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filename = `${id}.${meta.ext}`;

    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

    return NextResponse.json({
      success: true,
      url: `/api/uploads/${filename}`,
      kind: meta.kind,
      size: file.size,
      original_name: (file as File).name || filename
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Ошибка загрузки файла' }, { status: 500 });
  }
}
