import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'electrodrivers_db.json');
const SCHEMA_FILE = path.join(process.cwd(), 'data', 'schema.sql');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'init-db.sql');

function escapeSqlString(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function escapeJson(val: any): string {
  if (val === null || val === undefined) return "'{}'::jsonb";
  return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
}

function escapeArray(arr: string[]): string {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return "'{}'";
  const escaped = arr.map(item => `"${String(item).replace(/"/g, '\\"')}"`).join(',');
  return `'{${escaped}}'`;
}

async function exportSql() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('DB file not found:', DB_FILE);
    return;
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  const schema = fs.readFileSync(SCHEMA_FILE, 'utf-8');

  const lines: string[] = [];
  lines.push('-- =========================================================');
  lines.push('-- Auto-generated Electrodrivers Database Seed for PostgreSQL');
  lines.push(`-- Exported at: ${new Date().toISOString()}`);
  lines.push('-- =========================================================\n');
  lines.push(schema);
  lines.push('\n-- =========================================================');
  lines.push('-- DATA SEED');
  lines.push('-- =========================================================\n');

  // 1. Users
  if (db.users && db.users.length > 0) {
    lines.push('-- Users');
    for (const u of db.users) {
      lines.push(`INSERT INTO users (id, email, password_hash, telegram_nickname, full_name, role, status, avatar_url, last_login_at, created_at, updated_at) VALUES (${escapeSqlString(u.id)}, ${escapeSqlString(u.email)}, ${escapeSqlString(u.password_hash)}, ${escapeSqlString(u.telegram_nickname)}, ${escapeSqlString(u.full_name)}, ${escapeSqlString(u.role)}, ${escapeSqlString(u.status)}, ${escapeSqlString(u.avatar_url)}, ${escapeSqlString(u.last_login_at)}, ${escapeSqlString(u.created_at)}, ${escapeSqlString(u.updated_at)}) ON CONFLICT (id) DO NOTHING;`);
    }
    lines.push('');
  }

  // 2. Spaces
  if (db.spaces && db.spaces.length > 0) {
    lines.push('-- Spaces');
    for (const s of db.spaces) {
      lines.push(`INSERT INTO spaces (id, name, slug, description, icon, "order", created_at, updated_at) VALUES (${escapeSqlString(s.id)}, ${escapeSqlString(s.name)}, ${escapeSqlString(s.slug)}, ${escapeSqlString(s.description)}, ${escapeSqlString(s.icon)}, ${s.order || 0}, ${escapeSqlString(s.created_at || new Date().toISOString())}, ${escapeSqlString(s.updated_at || new Date().toISOString())}) ON CONFLICT (id) DO NOTHING;`);
    }
    lines.push('');
  }

  // 3. Articles
  if (db.articles && db.articles.length > 0) {
    lines.push('-- Articles');
    for (const a of db.articles) {
      lines.push(`INSERT INTO articles (id, space_id, title, slug, content, excerpt, author_id, author_name, author_role, parent_id, "order", tags, is_pinned, views_count, read_time_minutes, created_at, updated_at) VALUES (${escapeSqlString(a.id)}, ${escapeSqlString(a.space_id)}, ${escapeSqlString(a.title)}, ${escapeSqlString(a.slug)}, ${escapeSqlString(a.content)}, ${escapeSqlString(a.excerpt)}, ${escapeSqlString(a.author_id)}, ${escapeSqlString(a.author_name)}, ${escapeSqlString(a.author_role)}, ${escapeSqlString(a.parent_id)}, ${a.order || 0}, ${escapeArray(a.tags || [])}, ${a.is_pinned ? 'TRUE' : 'FALSE'}, ${a.views_count || 0}, ${a.read_time_minutes || 1}, ${escapeSqlString(a.created_at)}, ${escapeSqlString(a.updated_at)}) ON CONFLICT (id) DO NOTHING;`);
    }
    lines.push('');
  }

  // 4. Reports
  if (db.reports && db.reports.length > 0) {
    lines.push('-- CRM Employee Reports');
    for (const r of db.reports) {
      lines.push(`INSERT INTO reports (id, telegram_user_id, telegram_username, employee_name, report_type, title, shift_date, status, metrics, notes, attachments, raw_payload, review_comment, reviewer_id, reviewer_name, created_at, updated_at) VALUES (${escapeSqlString(r.id)}, ${escapeSqlString(r.telegram_user_id)}, ${escapeSqlString(r.telegram_username)}, ${escapeSqlString(r.employee_name)}, ${escapeSqlString(r.report_type)}, ${escapeSqlString(r.title)}, ${escapeSqlString(r.shift_date)}, ${escapeSqlString(r.status)}, ${escapeJson(r.metrics)}, ${escapeSqlString(r.notes)}, ${escapeJson(r.attachments)}, ${escapeJson(r.raw_payload)}, ${escapeSqlString(r.review_comment)}, ${escapeSqlString(r.reviewer_id)}, ${escapeSqlString(r.reviewer_name)}, ${escapeSqlString(r.created_at)}, ${escapeSqlString(r.updated_at)}) ON CONFLICT (id) DO NOTHING;`);
    }
    lines.push('');
  }

  // 5. Onboarding Steps
  if (db.onboarding_steps && db.onboarding_steps.length > 0) {
    lines.push('-- Onboarding Steps');
    for (const o of db.onboarding_steps) {
      lines.push(`INSERT INTO onboarding_steps (id, title, description, "order", article_slug, required_role, created_at) VALUES (${escapeSqlString(o.id)}, ${escapeSqlString(o.title)}, ${escapeSqlString(o.description)}, ${o.order || 0}, ${escapeSqlString(o.article_slug)}, ${escapeSqlString(o.required_role || 'user')}, ${escapeSqlString(o.created_at || new Date().toISOString())}) ON CONFLICT (id) DO NOTHING;`);
    }
    lines.push('');
  }

  // 6. Audit Logs
  if (db.audit_logs && db.audit_logs.length > 0) {
    lines.push('-- Audit Logs');
    for (const l of db.audit_logs) {
      lines.push(`INSERT INTO audit_logs (id, actor_id, actor_email, actor_telegram, action, target_id, target_type, details, ip_address, created_at) VALUES (${escapeSqlString(l.id)}, ${escapeSqlString(l.actor_id)}, ${escapeSqlString(l.actor_email)}, ${escapeSqlString(l.actor_telegram)}, ${escapeSqlString(l.action)}, ${escapeSqlString(l.target_id)}, ${escapeSqlString(l.target_type)}, ${escapeSqlString(l.details)}, ${escapeSqlString(l.ip_address)}, ${escapeSqlString(l.created_at)}) ON CONFLICT (id) DO NOTHING;`);
    }
    lines.push('');
  }

  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'));
  console.log(`Successfully generated PostgreSQL init seed file: ${OUTPUT_FILE} (${lines.length} lines)`);
}

exportSql();
