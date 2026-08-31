-- =========================================================
-- Electrodrivers Portal — Production PostgreSQL Schema
-- Database: electrodrivers_db
-- =========================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telegram_nickname VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'blocked')),
    avatar_url TEXT,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_nickname);

-- 2. Knowledge Base Spaces Table
CREATE TABLE IF NOT EXISTS spaces (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(64),
    "order" INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spaces_slug ON spaces(slug);
CREATE INDEX IF NOT EXISTS idx_spaces_order ON spaces("order");

-- 3. Knowledge Base Articles Table
CREATE TABLE IF NOT EXISTS articles (
    id VARCHAR(64) PRIMARY KEY,
    space_id VARCHAR(64) NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    author_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255) NOT NULL,
    author_role VARCHAR(32) NOT NULL,
    parent_id VARCHAR(64) REFERENCES articles(id) ON DELETE SET NULL,
    "order" INT NOT NULL DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    views_count INT NOT NULL DEFAULT 0,
    read_time_minutes INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_space ON articles(space_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_pinned_order ON articles(is_pinned DESC, "order" ASC);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN (tags);

-- 4. Employee Reports CRM Table (Telegram Bot Webhook Ingestion)
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(64) PRIMARY KEY,
    telegram_user_id VARCHAR(64),
    telegram_username VARCHAR(100) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(64) NOT NULL DEFAULT 'shift_report' CHECK (
        report_type IN ('shift_report', 'incident', 'maintenance', 'inspection', 'weekly_summary')
    ),
    title VARCHAR(500) NOT NULL,
    shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending_review' CHECK (
        status IN ('pending_review', 'approved', 'rejected', 'requires_revision')
    ),
    metrics JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    review_comment TEXT,
    reviewer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reviewer_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_shift_date ON reports(shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_tg_user ON reports(telegram_username);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_metrics ON reports USING GIN (metrics);

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    actor_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255) NOT NULL,
    actor_telegram VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_email);

-- 6. Onboarding Steps Table
CREATE TABLE IF NOT EXISTS onboarding_steps (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    "order" INT NOT NULL,
    article_slug VARCHAR(255),
    required_role VARCHAR(32) NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_order ON onboarding_steps("order");

-- 7. User Onboarding Progress Table
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    completed_steps TEXT[] DEFAULT '{}',
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
