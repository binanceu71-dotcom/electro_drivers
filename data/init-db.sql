-- =========================================================
-- Auto-generated Electrodrivers Database Seed for PostgreSQL
-- Exported at: 2026-08-30T10:23:22.062Z
-- =========================================================

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


-- =========================================================
-- DATA SEED
-- =========================================================

-- Users
INSERT INTO users (id, email, password_hash, telegram_nickname, full_name, role, status, avatar_url, last_login_at, created_at, updated_at) VALUES ('usr-root-001', 'admin@electrodrivers.ru', 'AdminPassword2026', '@electrodrivers_admin', 'Администратор системы', 'superadmin', 'active', NULL, '2026-08-30T10:19:41.477Z', '2026-08-30T10:01:49.951Z', '2026-08-30T10:01:49.951Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, email, password_hash, telegram_nickname, full_name, role, status, avatar_url, last_login_at, created_at, updated_at) VALUES ('usr-1788084115349-eh6h', 'regular@electrodrivers.ru', 'UserPassword2026', '@regular_driver', '@regular_driver', 'user', 'active', NULL, '2026-08-30T10:01:55.398Z', '2026-08-30T10:01:55.349Z', '2026-08-30T10:01:55.382Z') ON CONFLICT (id) DO NOTHING;

-- Spaces
INSERT INTO spaces (id, name, slug, description, icon, "order", created_at, updated_at) VALUES ('space-regulations', 'Регламенты и стандарты', 'regulations', 'Основные корпоративные правила, инструкции и регламенты работы участников.', NULL, 1, '2026-08-30T10:23:22.063Z', '2026-08-30T10:23:22.063Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO spaces (id, name, slug, description, icon, "order", created_at, updated_at) VALUES ('space-charging', 'Зарядная инфраструктура', 'charging-infrastructure', 'Стандарты зарядных станций (CCS2, GB/T, Type 2), правила подключения и эксплуатация.', NULL, 2, '2026-08-30T10:23:22.063Z', '2026-08-30T10:23:22.063Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO spaces (id, name, slug, description, icon, "order", created_at, updated_at) VALUES ('space-safety', 'Безопасность и регламенты ЧС', 'safety-protocols', 'Инструкции по технической безопасности при работе с высоковольтными системами.', NULL, 3, '2026-08-30T10:23:22.063Z', '2026-08-30T10:23:22.063Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO spaces (id, name, slug, description, icon, "order", created_at, updated_at) VALUES ('space-it-api', 'IT-инфраструктура и API', 'it-infrastructure-api', 'Техническая документация, протоколы телеметрии, интеграции и спецификации API.', NULL, 4, '2026-08-30T10:23:22.063Z', '2026-08-30T10:23:22.063Z') ON CONFLICT (id) DO NOTHING;

-- Articles
INSERT INTO articles (id, space_id, title, slug, content, excerpt, author_id, author_name, author_role, parent_id, "order", tags, is_pinned, views_count, read_time_minutes, created_at, updated_at) VALUES ('art-001', 'space-regulations', 'Регламент допуска и подготовки к выходу на смену', 'operational-checklist', '## 1. Общие положения

Настоящий регламент определяет порядок подготовки и проверки оборудования участниками системы **Electrodrivers**.

---

### 2. Обязательный чек-лист перед началом работы:

- [x] Проверка авторизации в корпоративном портале
- [x] Контроль уровня заряда батареи (не менее 80% перед выходом на линию)
- [x] Визуальный осмотр кабелей и коннекторов
- [ ] Фиксация показаний одометра

> ⚠️ **Важно:** При обнаружении любых повреждений кабелей или изоляции немедленно сообщите в диспетчерскую службу через [Telegram-бота](https://t.me/ElectrodriversBot).

---

### 3. Фото и видео фиксация

При передаче смены обязательно прикрепите фотоотчет показаний приборов:

![Приборная панель и заряд](https://images.unsplash.com/photo-1558441719-8b489c63f79b?w=800&auto=format&fit=crop&q=80)', 'Обязательный порядок проверки состояния оборудования, батареи и документов перед началом работы.', 'usr-root-001', 'Администратор системы', 'superadmin', NULL, 1, '{"регламент","инструкция","онбординг"}', TRUE, 1, 4, '2026-08-30T10:01:49.951Z', '2026-08-30T10:01:49.951Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO articles (id, space_id, title, slug, content, excerpt, author_id, author_name, author_role, parent_id, "order", tags, is_pinned, views_count, read_time_minutes, created_at, updated_at) VALUES ('art-002', 'space-charging', 'Стандарты зарядных станций и протоколы подключения', 'charging-standards-overview', '## Зарядные протоколы и стандарты

В инфраструктуре Electrodrivers применяются стандарты быстрой (DC) и переменной (AC) зарядки.

---

### Спецификация разъемов:

| Стандарт | Тип тока | Максимальная мощность | Применение |
| :--- | :--- | :--- | :--- |
| **CCS Combo 2** | Постоянный (DC) | до 360 кВт | Скоростные магистральные хабы |
| **GB/T DC** | Постоянный (DC) | до 250 кВт | Городские ультрабыстрые станции |
| **Type 2 (Mennekes)** | Переменный (AC) | до 22 кВт | Ночная парковочная зарядка |

---

### Видеоинструкция по подключению:

[Смотреть обучающее видео по высоковольтным коннекторам](https://electrodrivers.ru/video/charging-guide.mp4)', 'Спецификация стандартов быстрой и медленной зарядки, требования безопасности и регламенты хабов.', 'usr-root-001', 'Администратор системы', 'superadmin', NULL, 1, '{"зарядка","стандарты","GB/T","CCS2"}', TRUE, 1, 5, '2026-08-30T10:01:49.951Z', '2026-08-30T10:01:49.951Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO articles (id, space_id, title, slug, content, excerpt, author_id, author_name, author_role, parent_id, "order", tags, is_pinned, views_count, read_time_minutes, created_at, updated_at) VALUES ('art-003', 'space-safety', 'Инструкция по безопасности при работе с высоковольтными системами', 'high-voltage-safety', '## Техническая безопасность

Тяговые батареи и силовая проводка находятся под постоянным напряжением от 400V до 800V DC.

---

### Действия при возникновении неисправности:

1. **Немедленно обесточить систему:** Выключить зажигание и активировать сервисный размыкатель.
2. **Оценить обстановку:** Отойти на безопасное расстояние (не менее 20 метров).
3. **Оповещение:** Отправить экстренный отчет через CRM / Telegram-бота.', 'Правила техники безопасности, действия в нештатных ситуациях и регламент оповещения.', 'usr-root-001', 'Администратор системы', 'superadmin', NULL, 1, '{"безопасность","высокое напряжение","регламент"}', TRUE, 1, 4, '2026-08-30T10:01:49.951Z', '2026-08-30T10:01:49.951Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO articles (id, space_id, title, slug, content, excerpt, author_id, author_name, author_role, parent_id, "order", tags, is_pinned, views_count, read_time_minutes, created_at, updated_at) VALUES ('art-004', 'space-it-api', 'Спецификация интеграции телеметрии и вебхуков CRM', 'telemetry-integration-spec', '## Архитектура вебхука CRM отчетов

Telegram-бот отправляет JSON-пакеты методом `POST` на адрес:
```
POST /api/crm/webhook
```

---

### Пример структуры входящего JSON отчета:

```json
{
  "telegram_user_id": "98124571",
  "telegram_username": "@driver_ivan",
  "employee_name": "Иван Смирнов",
  "report_type": "shift_report",
  "shift_date": "2026-08-30",
  "title": "Смена закрыта без замечаний",
  "metrics": {
    "hours_worked": 8.5,
    "mileage_km": 194.2,
    "kwh_charged": 38.4,
    "vehicle_plate": "Е777КХ 799"
  },
  "notes": "Все запланированные маршруты выполнены, замечаний по батарее нет.",
  "attachments": [
    {
      "type": "photo",
      "url": "https://images.unsplash.com/photo-1558441719-8b489c63f79b?w=800",
      "caption": "Одометр и приборная панель"
    }
  ]
}
```
', 'Архитектура сбора отчетов через вебхук Telegram-бота и протокол OCPP 2.0.1.', 'usr-root-001', 'Администратор системы', 'superadmin', NULL, 1, '{"api","телеметрия","вебхук","crm"}', FALSE, 1, 6, '2026-08-30T10:01:49.951Z', '2026-08-30T10:01:49.951Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO articles (id, space_id, title, slug, content, excerpt, author_id, author_name, author_role, parent_id, "order", tags, is_pinned, views_count, read_time_minutes, created_at, updated_at) VALUES ('art-1788084915850', 'space-regulations', 'Инструкция по работе с CRM отчетов Telegram', 'инструкция-по-работе-с-crm-отчетов-telegram-gm3c', '### Регламент отправки отчетов

1. Бот отправляет JSON на `/api/crm/webhook`
2. Администраторы модерируют в CRM

> Важно: проверяйте показания телеметрии!', ' Регламент отправки отчетов

1. Бот отправляет JSON на /api/crm/webhook
2. Администраторы модерируют в CRM

> Важно: проверяйте показания телемет...', 'usr-root-001', 'Администратор системы', 'superadmin', NULL, 5, '{"crm","инструкция","telegram"}', TRUE, 0, 1, '2026-08-30T10:15:15.850Z', '2026-08-30T10:15:15.850Z') ON CONFLICT (id) DO NOTHING;

-- CRM Employee Reports
INSERT INTO reports (id, telegram_user_id, telegram_username, employee_name, report_type, title, shift_date, status, metrics, notes, attachments, raw_payload, review_comment, reviewer_id, reviewer_name, created_at, updated_at) VALUES ('rep-1788084961843-6zo2', '883719', '@ev_mechanic_oleg', 'Олег Ремонтов', 'maintenance', 'Плановое ТО зарядной станции Hub-4', '2026-08-30', 'approved', '{"connectors_tested":4,"firmware_version":"v3.14.2","power_output_kw":150}'::jsonb, 'Проверена изоляция кабелей GB/T и CCS2. Заменен вентилятор охлаждения силового модуля.', '[]'::jsonb, '{"bot_id":"tg_field_ops_bot","telegram_user":{"id":883719,"username":"ev_mechanic_oleg","first_name":"Олег","last_name":"Ремонтов"},"report":{"type":"maintenance","title":"Плановое ТО зарядной станции Hub-4","shift_date":"2026-08-30","location":"Зарядный хаб Восток, ул. Ленина 42","metrics":{"connectors_tested":4,"firmware_version":"v3.14.2","power_output_kw":150},"notes":"Проверена изоляция кабелей GB/T и CCS2. Заменен вентилятор охлаждения силового модуля."}}'::jsonb, 'Принято главным инженером, все замеры в норме.', 'usr-root-001', 'Администратор системы', '2026-08-30T10:16:01.843Z', '2026-08-30T10:16:01.866Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO reports (id, telegram_user_id, telegram_username, employee_name, report_type, title, shift_date, status, metrics, notes, attachments, raw_payload, review_comment, reviewer_id, reviewer_name, created_at, updated_at) VALUES ('rep-1788084915818-rcf7', NULL, '@unknown', '@unknown', 'shift_report', 'Отчет @unknown от 2026-08-30', '2026-08-30', 'approved', '{}'::jsonb, '', '[]'::jsonb, '{"bot_id":"tg_field_ops_bot","telegram_user":{"id":883719,"username":"ev_mechanic_oleg","first_name":"Олег","last_name":"Ремонтов"},"report":{"type":"maintenance","title":"Плановое ТО зарядной станции Hub-4","shift_date":"2026-08-30","location":"Зарядный хаб Восток, ул. Ленина 42","metrics":{"connectors_tested":4,"firmware_version":"v3.14.2","power_output_kw":150},"notes":"Проверена изоляция кабелей GB/T и CCS2. Заменен вентилятор охлаждения силового модуля."}}'::jsonb, 'Принято главным инженером, все замеры в норме.', 'usr-root-001', 'Администратор системы', '2026-08-30T10:15:15.818Z', '2026-08-30T10:15:15.835Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO reports (id, telegram_user_id, telegram_username, employee_name, report_type, title, shift_date, status, metrics, notes, attachments, raw_payload, review_comment, reviewer_id, reviewer_name, created_at, updated_at) VALUES ('rep-1788084906340-gj19', NULL, '@unknown', '@unknown', 'shift_report', 'Отчет @unknown от 2026-08-30', '2026-08-30', 'pending_review', '{}'::jsonb, '', '[]'::jsonb, '{"bot_id":"tg_field_ops_bot","telegram_user":{"id":883719,"username":"ev_mechanic_oleg","first_name":"Олег","last_name":"Ремонтов"},"report":{"type":"maintenance","title":"Плановое ТО зарядной станции Hub-4","shift_date":"2026-08-30","location":"Зарядный хаб Восток, ул. Ленина 42","metrics":{"connectors_tested":4,"firmware_version":"v3.14.2","power_output_kw":150},"notes":"Проверена изоляция кабелей GB/T и CCS2. Заменен вентилятор охлаждения силового модуля.","attachments":[{"type":"photo","url":"/mock/photo1.jpg","caption":"Силовой шкаф после ТО"}]}}'::jsonb, NULL, NULL, NULL, '2026-08-30T10:15:06.340Z', '2026-08-30T10:15:06.340Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO reports (id, telegram_user_id, telegram_username, employee_name, report_type, title, shift_date, status, metrics, notes, attachments, raw_payload, review_comment, reviewer_id, reviewer_name, created_at, updated_at) VALUES ('rep-1788084816769-hnnz', NULL, '@unknown', '@unknown', 'shift_report', 'Отчет @unknown от 2026-08-30', '2026-08-30', 'pending_review', '{}'::jsonb, '', '[]'::jsonb, '{"bot_id":"tg_field_ops_bot","telegram_user":{"id":999888,"username":"test_agent","first_name":"Алексей","last_name":"Тестов"},"report":{"type":"daily_shift","title":"Смена завершена штатно","location":"Хаб Север","shift_hours":8,"metrics":{"inspections_count":14,"incidents_resolved":2,"parts_replaced":1},"notes":"Замечаний по оборудованию нет"}}'::jsonb, NULL, NULL, NULL, '2026-08-30T10:13:36.769Z', '2026-08-30T10:13:36.769Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO reports (id, telegram_user_id, telegram_username, employee_name, report_type, title, shift_date, status, metrics, notes, attachments, raw_payload, review_comment, reviewer_id, reviewer_name, created_at, updated_at) VALUES ('rep-1788084110009-lbub', '9918231', '@driver_mikhail', 'Михаил Кузнецов', 'shift_report', 'Отчет по вечерней смене', '2026-08-30', 'approved', '{"hours_worked":7.5,"mileage_km":165,"kwh_charged":31.5,"vehicle_plate":"В333ВВ 799"}'::jsonb, 'Смена закрыта. Замечаний по работе станции и батареи нет.', '[{"type":"photo","url":"https://images.unsplash.com/photo-1558441719-8b489c63f79b?w=800","caption":"Фото к отчету"}]'::jsonb, '{"telegram_user_id":"9918231","telegram_username":"@driver_mikhail","employee_name":"Михаил Кузнецов","report_type":"shift_report","shift_date":"2026-08-30","title":"Отчет по вечерней смене","metrics":{"hours_worked":7.5,"mileage_km":165,"kwh_charged":31.5,"vehicle_plate":"В333ВВ 799"},"notes":"Смена закрыта. Замечаний по работе станции и батареи нет.","photo_url":"https://images.unsplash.com/photo-1558441719-8b489c63f79b?w=800"}'::jsonb, 'Отчет принят без замечаний', 'usr-root-001', 'Администратор системы', '2026-08-30T10:01:50.009Z', '2026-08-30T10:01:50.044Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO reports (id, telegram_user_id, telegram_username, employee_name, report_type, title, shift_date, status, metrics, notes, attachments, raw_payload, review_comment, reviewer_id, reviewer_name, created_at, updated_at) VALUES ('rep-001', '12498211', '@driver_alex', 'Алексей Воронов', 'shift_report', 'Закрытие дневной смены (Маршрут Центр)', '2026-08-30', 'pending_review', '{"hours_worked":8,"mileage_km":182.5,"kwh_charged":34.2,"vehicle_plate":"Е777КХ 799"}'::jsonb, 'Смена прошла штатно. Быстрая зарядка на хабе CCS2 выполнена за 22 минуты. Батарея на конец смены: 86%.', '[{"type":"photo","url":"https://images.unsplash.com/photo-1558441719-8b489c63f79b?w=800&auto=format&fit=crop&q=80","caption":"Показания одометра и зарядного терминала"}]'::jsonb, '{}'::jsonb, NULL, NULL, NULL, '2026-08-30T10:01:49.951Z', '2026-08-30T10:01:49.951Z') ON CONFLICT (id) DO NOTHING;

-- Onboarding Steps
INSERT INTO onboarding_steps (id, title, description, "order", article_slug, required_role, created_at) VALUES ('step-1', 'Изучение регламента допуска к смене', 'Ознакомьтесь с правилами проверки оборудования перед выходом на линию.', 1, NULL, 'user', '2026-08-30T10:23:22.063Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO onboarding_steps (id, title, description, "order", article_slug, required_role, created_at) VALUES ('step-2', 'Стандарты зарядных станций и протоколы', 'Изучите типы разъемов (CCS2, GB/T, Type 2) и правила проведения сессий зарядки.', 2, NULL, 'user', '2026-08-30T10:23:22.063Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO onboarding_steps (id, title, description, "order", article_slug, required_role, created_at) VALUES ('step-3', 'Инструктаж по технике безопасности', 'Ознакомьтесь с правилами безопасности при работе с высоковольтными системами.', 3, NULL, 'user', '2026-08-30T10:23:22.063Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO onboarding_steps (id, title, description, "order", article_slug, required_role, created_at) VALUES ('step-4', 'Отправка первого тестового отчета в Telegram-бот', 'Отправьте статус смены в бота для проверки интеграции с CRM.', 4, NULL, 'user', '2026-08-30T10:23:22.063Z') ON CONFLICT (id) DO NOTHING;

-- Audit Logs
INSERT INTO audit_logs (id, actor_id, actor_email, actor_telegram, action, target_id, target_type, details, ip_address, created_at) VALUES ('log-1788084961866', 'usr-root-001', 'admin@electrodrivers.ru', '@electrodrivers_admin', 'REPORT_STATUS_CHANGE', 'rep-1788084961843-6zo2', 'report', 'Статус отчета rep-1788084961843-6zo2 изменен с pending_review на approved модератором @electrodrivers_admin', NULL, '2026-08-30T10:16:01.866Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO audit_logs (id, actor_id, actor_email, actor_telegram, action, target_id, target_type, details, ip_address, created_at) VALUES ('log-1788084961843', 'telegram_bot', 'webhook', '@ev_mechanic_oleg', 'REPORT_SUBMITTED', 'rep-1788084961843-6zo2', 'report', 'Поступил отчет от @ev_mechanic_oleg (Плановое ТО зарядной станции Hub-4)', NULL, '2026-08-30T10:16:01.843Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO audit_logs (id, actor_id, actor_email, actor_telegram, action, target_id, target_type, details, ip_address, created_at) VALUES ('log-1788084915850', 'usr-root-001', 'admin@electrodrivers.ru', '@electrodrivers_admin', 'ARTICLE_CREATE', 'art-1788084915850', 'article', 'Создана статья: "Инструкция по работе с CRM отчетов Telegram"', NULL, '2026-08-30T10:15:15.850Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO audit_logs (id, actor_id, actor_email, actor_telegram, action, target_id, target_type, details, ip_address, created_at) VALUES ('log-1788084915835', 'usr-root-001', 'admin@electrodrivers.ru', '@electrodrivers_admin', 'REPORT_STATUS_CHANGE', 'rep-1788084915818-rcf7', 'report', 'Статус отчета rep-1788084915818-rcf7 изменен с pending_review на approved модератором @electrodrivers_admin', NULL, '2026-08-30T10:15:15.835Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO audit_logs (id, actor_id, actor_email, actor_telegram, action, target_id, target_type, details, ip_address, created_at) VALUES ('log-1788084915818', 'telegram_bot', 'webhook', '@unknown', 'REPORT_SUBMITTED', 'rep-1788084915818-rcf7', 'report', 'Поступил отчет от @unknown (Отчет @unknown от 2026-08-30)', NULL, '2026-08-30T10:15:15.818Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO audit_logs (id, actor_id, actor_email, actor_telegram, action, target_id, target_type, details, ip_address, created_at) VALUES ('log-1788084906340', 'telegram_bot', 'webhook', '@unknown', 'REPORT_SUBMITTED', 'rep-1788084906340-gj19', 'report', 'Поступил отчет от @unknown (Отчет @unknown от 2026-08-30)', NULL, '2026-08-30T10:15:06.340Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO audit_logs (id, actor_id, actor_email, actor_telegram, action, target_id, target_type, details, ip_address, created_at) VALUES ('log-1788084816769', 'telegram_bot', 'webhook', '@unknown', 'REPORT_SUBMITTED', 'rep-1788084816769-hnnz', 'report', 'Поступил отчет от @unknown (Отчет @unknown от 2026-08-30)', NULL, '2026-08-30T10:13:36.769Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO audit_logs (id, actor_id, actor_email, actor_telegram, action, target_id, target_type, details, ip_address, created_at) VALUES ('log-1788084115382', 'usr-root-001', 'admin@electrodrivers.ru', '@electrodrivers_admin', 'USER_STATUS_CHANGE', 'usr-1788084115349-eh6h', 'user', 'Статус пользователя regular@electrodrivers.ru изменен с pending на active', NULL, '2026-08-30T10:01:55.382Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO audit_logs (id, actor_id, actor_email, actor_telegram, action, target_id, target_type, details, ip_address, created_at) VALUES ('log-1788084115349', 'system', 'system', '@system', 'USER_REGISTERED', 'usr-1788084115349-eh6h', 'user', 'Регистрация: regular@electrodrivers.ru (@regular_driver), статус: pending', NULL, '2026-08-30T10:01:55.349Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO audit_logs (id, actor_id, actor_email, actor_telegram, action, target_id, target_type, details, ip_address, created_at) VALUES ('log-1788084110044', 'usr-root-001', 'admin@electrodrivers.ru', '@electrodrivers_admin', 'REPORT_STATUS_CHANGE', 'rep-1788084110009-lbub', 'report', 'Статус отчета rep-1788084110009-lbub изменен с pending_review на approved модератором @electrodrivers_admin', NULL, '2026-08-30T10:01:50.044Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO audit_logs (id, actor_id, actor_email, actor_telegram, action, target_id, target_type, details, ip_address, created_at) VALUES ('log-1788084110009', 'telegram_bot', 'webhook', '@driver_mikhail', 'REPORT_SUBMITTED', 'rep-1788084110009-lbub', 'report', 'Поступил отчет от @driver_mikhail (Отчет по вечерней смене)', NULL, '2026-08-30T10:01:50.009Z') ON CONFLICT (id) DO NOTHING;
INSERT INTO audit_logs (id, actor_id, actor_email, actor_telegram, action, target_id, target_type, details, ip_address, created_at) VALUES ('log-init-001', 'usr-root-001', 'admin@electrodrivers.ru', '@electrodrivers_admin', 'SYSTEM_INITIALIZATION', 'system', 'system', 'Инициализация портала Electrodrivers и модулей CRM', NULL, '2026-08-30T10:01:49.951Z') ON CONFLICT (id) DO NOTHING;
