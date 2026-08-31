# 🚀 Electrodrivers Portal — Полное руководство по выходу в Production

Данное руководство содержит результаты проведенного **аудита безопасности**, описание архитектуры переноса базы данных в **PostgreSQL**, настройку **домена, SSL (HTTPS), Nginx, Docker Compose, Webhook Telegram** и регламент резервного копирования.

---

## 📑 Содержание
1. [Результаты аудита безопасности (Security Audit)](#1-результаты-аудита-безопасности)
2. [Архитектура Production-стека](#2-архитектура-production-стека)
3. [Подготовка сервера (VPS / VDS)](#3-подготовка-сервера-vps--vds)
4. [Настройка DNS и домена](#4-настройка-dns-и-домена)
5. [Миграция базы данных в PostgreSQL](#5-миграция-базы-данных-в-postgresql)
6. [Деплой через Docker Compose (Рекомендуемый способ)](#6-деплой-через-docker-compose)
7. [Альтернативный деплой (Node.js + PM2 + System PostgreSQL)](#7-альтернативный-деплой-pm2)
8. [Выпуск и автопродление SSL-сертификатов Let's Encrypt](#8-выпуск-и-автопродление-ssl-сертификатов)
9. [Подключение и защита Telegram Bot Webhook](#9-подключение-и-защита-telegram-bot-webhook)
10. [Автоматическое резервное копирование (Backups & Disaster Recovery)](#10-резервное-копирование)
11. [Мониторинг, логирование и чеклист перед запуском](#11-чеклист-перед-запуском)

---

## 1. Результаты аудита безопасности

В кодовой базе проведен аудит и внедрен комплекс защитных механизмов:

| Направление | Было (Dev/MVP) | Стало (Production Ready) | Статус |
| :--- | :--- | :--- | :---: |
| **Хеширование паролей** | Plain / базовая проверка | Соленый PBKDF2 (10,000 итераций, SHA-512, 64-байтный ключ) + защита от атак по времени `crypto.timingSafeEqual`. Автоматический апгрейд при первом входе. | ✅ Защищено |
| **Сессионные токены** | Base64 JSON | Криптографическая подпись HMAC-SHA256 (`SESSION_SECRET`), проверка срока действия (`exp`), флаги `httpOnly: true`, `SameSite: 'lax'`, `secure: true` (HTTPS). | ✅ Защищено |
| **Защита от брутфорса / DDoS** | Отсутствовала | Скользящий Rate Limiter (`lib/rate-limit.ts`): 10 попыток входа/мин, 5 регистраций/10 мин, 120 вызовов вебхука/мин. Заголовки `Retry-After`, `X-RateLimit-*`. | ✅ Защищено |
| **Telegram Webhook** | Прием любых JSON | Валидация заголовка `X-Telegram-Bot-Api-Secret-Token` по секрету `TELEGRAM_WEBHOOK_SECRET`. Защита от подделки отчетов. | ✅ Защищено |
| **Security Headers** | Стандартные Next.js | HSTS (`max-age=63072000`), X-Frame-Options (`SAMEORIGIN`), X-Content-Type-Options (`nosniff`), X-XSS-Protection, Referrer-Policy, Permissions-Policy. | ✅ Защищено |
| **Хранилище данных** | Файловый JSON | Полноценная реляционная схема PostgreSQL 16 с внешними ключами, индексами, GIN-индексами для JSONB метрик и автоматической инициализацией. | ✅ Защищено |
| **Модерация и роли** | Проверка на клиенте/сервере | Строгая верификация на бэкенде: SuperAdmin, Admin, User, статус `active` обязателен. Доступ к CRM и управлению персоналом только администраторам. | ✅ Защищено |

---

## 2. Архитектура Production-стека

```
                   [ Клиент / Telegram Bot ]
                              │ (HTTPS :443)
                              ▼
                     [ Nginx Reverse Proxy ]
                     - SSL Termination (Let's Encrypt)
                     - Rate Limiting & DDOS Filter
                     - Gzip Compression & Static Cache
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       [ Next.js 14 App ]          [ Static Cache / Assets ]
     - Node.js 20 (Alpine)
     - HMAC Auth & RBAC
     - API Webhooks & CRM
               │
               ▼
     [ PostgreSQL 16 DB ]
     - Persistent Docker Volume
     - Daily automated pg_dump
```

---

## 3. Подготовка сервера (VPS / VDS)

**Минимальные системные требования:**
- CPU: 2 ядра
- RAM: 2–4 ГБ
- SSD: 20–40 ГБ
- ОС: Ubuntu 22.04 LTS или Ubuntu 24.04 LTS

### Шаг 3.1. Базовая настройка безопасности сервера
Подключитесь по SSH:
```bash
ssh root@YOUR_SERVER_IP
```

Обновите систему и создайте непривилегированного пользователя:
```bash
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban htop unzip

# Создание пользователя deploy
adduser deploy
usermod -aG sudo deploy

# Настройка файрвола UFW
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### Шаг 3.2. Установка Docker и Docker Compose
```bash
# Установка официального Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker deploy

# Проверка
docker --version
docker compose version
```

---

## 4. Настройка DNS и домена

В панели управления вашего регистратора домена (или Cloudflare) создайте A-записи:

| Тип | Имя хоста | Значение | TTL |
| :--- | :--- | :--- | :--- |
| `A` | `portal` (или `@`) | `YOUR_SERVER_IP` | 300 сек (Auto) |
| `A` | `www` | `YOUR_SERVER_IP` | 300 сек (Auto) |

> 💡 **Проверка делегирования DNS:**
> ```bash
> ping portal.electrodrivers.ru
> dig +short portal.electrodrivers.ru
> ```

---

## 5. Миграция базы данных в PostgreSQL

В репозиторий уже включены:
- `data/schema.sql` — схема таблиц, индексов и связей.
- `data/init-db.sql` — полный дамп текущей базы с готовыми учетными записями, статьями Базы знаний, шагами онбординга и журналами аудита.
- `scripts/export-seed-sql.ts` — генератор SQL-дампа из актуального JSON.

### Структура таблиц в PostgreSQL:
1. `users` (id, email, password_hash, telegram_nickname, role, status, ...)
2. `spaces` (id, name, slug, description, order)
3. `articles` (id, space_id, title, slug, content, tags, is_pinned, ...)
4. `reports` (id, telegram_user_id, telegram_username, employee_name, report_type, metrics JSONB, attachments JSONB, raw_payload JSONB, status, ...)
5. `audit_logs` (id, actor_id, actor_email, action, target_id, details, ...)
6. `onboarding_steps` & `user_onboarding_progress`

---

## 6. Деплой через Docker Compose (Рекомендуемый способ)

### Шаг 6.1. Клонирование репозитория на сервер
Перейдите под пользователя `deploy`:
```bash
su - deploy
git clone https://github.com/your-org/electrodrivers-portal.git /home/deploy/portal
cd /home/deploy/portal
```

### Шаг 6.2. Создание боевого `.env` файла
```bash
cp .env.example .env
nano .env
```

Сгенерируйте надежные секретные ключи:
```bash
# Генерация SESSION_SECRET
openssl rand -base64 48

# Генерация пароля для PostgreSQL
openssl rand -base64 24

# Генерация TELEGRAM_WEBHOOK_SECRET
openssl rand -hex 32
```

Заполните `.env`:
```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://portal.electrodrivers.ru

SESSION_SECRET=YOUR_GENERATED_SESSION_SECRET
POSTGRES_DB=electrodrivers_db
POSTGRES_USER=electro_admin
POSTGRES_PASSWORD=YOUR_STRONG_POSTGRES_PASSWORD
DATABASE_URL=postgresql://electro_admin:YOUR_STRONG_POSTGRES_PASSWORD@postgres:5432/electrodrivers_db

TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_WEBHOOK_SECRET=YOUR_GENERATED_WEBHOOK_SECRET
```

### Шаг 6.3. Первичный выпуск SSL через Certbot
Для первичного получения сертификата запустите временный контейнер Certbot:
```bash
# Создание директорий
mkdir -p certbot_etc certbot_var nginx/conf.d

# Первичный запуск Nginx и запрос сертификата
docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
  -d portal.electrodrivers.ru \
  --email admin@electrodrivers.ru \
  --agree-tos --no-eff-email" certbot
```

### Шаг 6.4. Запуск всех сервисов в фоне
```bash
docker compose up -d --build
```

Проверьте статус контейнеров:
```bash
docker compose ps
docker compose logs -f app
```

Все 4 сервиса (`electrodrivers_postgres`, `electrodrivers_app`, `electrodrivers_nginx`, `electrodrivers_certbot`) будут запущены и работать с автоперезапуском при сбоях.

---

## 7. Альтернативный деплой (PM2 + System PostgreSQL)

Если вы деплоите без Docker:

1. **Установка Node.js 20 & PM2 & PostgreSQL:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql postgresql-contrib nginx
sudo npm install -g pm2
```

2. **Инициализация PostgreSQL:**
```bash
sudo -u postgres psql -c "CREATE USER electro_admin WITH PASSWORD 'StrongPassword2026!';"
sudo -u postgres psql -c "CREATE DATABASE electrodrivers_db OWNER electro_admin;"
sudo -u postgres psql -d electrodrivers_db -f data/init-db.sql
```

3. **Сборка и запуск Next.js через PM2:**
```bash
npm ci
npm run build
pm2 start npm --name "electrodrivers-portal" -- start -- -p 3000
pm2 save
pm2 startup
```

4. **Настройка Nginx хоста:**
Скопируйте `nginx/default.conf` в `/etc/nginx/sites-available/electrodrivers` и активируйте:
```bash
sudo ln -s /etc/nginx/sites-available/electrodrivers /etc/nginx/sites-enabled/
sudo certbot --nginx -d portal.electrodrivers.ru
sudo systemctl restart nginx
```

---

## 8. Выпуск и автопродление SSL-сертификатов

В `docker-compose.yml` встроен сервис `certbot`, который каждые 12 часов проверяет и автоматически продлевает сертификаты без остановки портала.

Для ручной проверки продления:
```bash
docker compose run --rm certbot renew --dry-run
```

---

## 9. Подключение и защита Telegram Bot Webhook

Чтобы Telegram-бот отправлял структурированные отчеты сотрудников в CRM:

### Шаг 9.1. Установка Webhook с Secret Token
Выполните запрос к Telegram Bot API:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://portal.electrodrivers.ru/api/crm/webhook",
    "secret_token": "YOUR_GENERATED_WEBHOOK_SECRET",
    "allowed_updates": ["message", "callback_query"]
  }'
```

Ответ Telegram должен быть:
```json
{"ok": true, "result": true, "description": "Webhook was set"}
```

### Шаг 9.2. Проверка статуса Webhook:
```bash
curl "https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

---

## 10. Автоматическое резервное копирование

Скрипт `scripts/backup-db.sh` производит создание сжатых дампов `pg_dump` с автоматической ротацией (хранение 14 дней).

### Настройка ежедневного резервного копирования в 03:00 ночи:
```bash
chmod +x /home/deploy/portal/scripts/backup-db.sh
crontab -e
```

Добавьте строку:
```cron
0 3 * * * /home/deploy/portal/scripts/backup-db.sh >> /var/log/electrodrivers_backup.log 2>&1
```

### Восстановление из бэкапа (Disaster Recovery):
```bash
gunzip < /var/backups/electrodrivers/db_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i electrodrivers_postgres psql -U electro_admin electrodrivers_db
```

---

## 11. Чеклист перед публичным запуском

- [ ] В `.env` заменен дефолтный `SESSION_SECRET` на случайную строку не менее 64 символов.
- [ ] Задан надежный пароль пользователя `POSTGRES_PASSWORD`.
- [ ] Изменен пароль учетной записи SuperAdmin (`admin@electrodrivers.ru`) в продакшене.
- [ ] DNS A-запись успешно указывает на IP боевого сервера.
- [ ] HTTPS сертификат активен, настроен редирект с `http://` на `https://`.
- [ ] Вебхук `/api/crm/webhook` зарегистрирован в Telegram Bot API с `secret_token`.
- [ ] Протестирован тестовый вход под SuperAdmin (`admin@electrodrivers.ru`).
- [ ] Протестировано создание и модерация отчетов в CRM (`/app/reports`).
- [ ] Включен cron для ежедневных бэкапов базы данных.
- [ ] UFW файрвол активен (открыты только порты 22, 80, 443).

🎉 **Портал Electrodrivers полностью готов к эксплуатации под высокими нагрузками!**
