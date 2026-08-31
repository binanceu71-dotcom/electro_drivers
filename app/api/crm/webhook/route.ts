import { NextRequest, NextResponse } from 'next/server';
import { createReport } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting: 120 webhook requests per minute
    const rl = checkRateLimit(req, { limit: 120, windowSec: 60, identifier: 'tg_webhook' });
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // 2. Webhook Secret Token Verification (Production Security)
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret && expectedSecret.trim().length > 0) {
      const incomingSecret = 
        req.headers.get('x-telegram-bot-api-secret-token') || 
        req.headers.get('x-webhook-secret') ||
        (req.headers.get('authorization')?.startsWith('Bearer ') 
          ? req.headers.get('authorization')?.substring(7) 
          : null);

      if (!incomingSecret || incomingSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized webhook secret' }, { status: 401 });
      }
    }

    const body = await req.json();

    // Support nested telegram_user / report structures or standard bot payloads
    const tgUser = body.telegram_user || body.user || body.from || body.message?.from || {};
    const reportData = body.report || body.data || body;

    const rawUsername = body.telegram_username || body.username || tgUser.username || tgUser.first_name || 'unknown';
    const telegram_username = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;
    
    const telegram_user_id = String(
      body.telegram_user_id || body.user_id || tgUser.id || ''
    );

    const firstName = tgUser.first_name || '';
    const lastName = tgUser.last_name || '';
    const combinedName = [firstName, lastName].filter(Boolean).join(' ');

    const employee_name = 
      body.employee_name || 
      body.name || 
      reportData.employee_name || 
      (combinedName ? combinedName : telegram_username);

    const report_type = 
      body.report_type || 
      reportData.type || 
      reportData.report_type || 
      'shift_report';

    const title = 
      body.title || 
      reportData.title || 
      `Отчет ${employee_name} (${telegram_username}) от ${new Date().toISOString().split('T')[0]}`;

    const shift_date = 
      body.shift_date || 
      reportData.shift_date || 
      new Date().toISOString().split('T')[0];

    const metrics = 
      reportData.metrics || 
      body.metrics || 
      {
        hours_worked: reportData.hours_worked || body.hours_worked || reportData.shift_hours,
        mileage_km: reportData.mileage_km || body.mileage_km || reportData.mileage,
        kwh_charged: reportData.kwh_charged || body.kwh_charged || reportData.kwh,
        vehicle_plate: reportData.vehicle_plate || body.vehicle_plate || reportData.car_plate,
        location: reportData.location || body.location
      };

    const notes = 
      reportData.notes || 
      body.notes || 
      body.comment || 
      body.text || 
      body.message?.text || 
      '';
    
    // Attachments (photos/files from telegram)
    let attachments = reportData.attachments || body.attachments || [];
    if (body.photo_url || body.image_url || reportData.photo_url) {
      attachments.push({
        type: 'photo',
        url: body.photo_url || body.image_url || reportData.photo_url,
        caption: body.photo_caption || reportData.photo_caption || 'Фото к отчету'
      });
    }

    const report = createReport({
      telegram_user_id,
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

    return NextResponse.json({
      success: true,
      report_id: report.id,
      message: 'Отчет успешно принят и ожидает проверки в CRM'
    }, { status: 201 });
  } catch (error: any) {
    console.error('CRM Webhook error:', error);
    return NextResponse.json({ error: 'Некорректный JSON или ошибка обработки: ' + error.message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/crm/webhook',
    security: process.env.TELEGRAM_WEBHOOK_SECRET ? 'secret_enforced' : 'open_or_test_mode',
    description: 'Electrodrivers CRM Telegram Bot Webhook. Send POST requests with JSON payload.'
  });
}
