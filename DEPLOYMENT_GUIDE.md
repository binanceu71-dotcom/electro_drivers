# 🚀 Electrodrivers Portal — Полное руководство по выходу в Production

Данное руководство содержит результаты проведенного **аудита безопасности**, описание архитектуры переноса базы данных в **PostgreSQL**, настройку **домена, SSL (HTTPS), Nginx, Docker Compose, Webhook Telegram** и регламент резервного копирования.

---

## ⚡ 0. Белый экран (React #418/#423): причина и решение раз и навсегда

### Что происходило
В консоли браузера были ошибки `Minified React error #418 / #423`, `HierarchyRequestError: Only one element on document allowed` — и белый экран, который «не лечился» никакими правками кода.

### Причина
Код был исправен (текущая сборка проходит проверку гидрации на всех страницах без единой ошибки). Проблема была в **доставке**: Next.js отдавал статические HTML-страницы с заголовком `Cache-Control: s-maxage=31536000, stale-while-revalidate` — разрешением любому промежуточному кэшу (CDN, Cloudflare, прокси хостинга) хранить HTML **целый год**. В результате браузеры получали **старый закэшированный HTML со старыми JS-чанками сломанной сборки**, сколько бы раз проект ни пересобирали. Дополнительно `.dockerignore` не работал (файл назывался `dockerignore.txt`), из-за чего в Docker-образ попадали стейл-артефакты с хоста.

### Что исправлено (защита на 4 уровнях)
1. **Приложение**: `export const dynamic = 'force-dynamic'` в корневом layout — HTML теперь всегда отдаётся с `Cache-Control: no-store, no-cache, must-revalidate` и не может осесть ни в одном кэше. Хешированная статика `/_next/static` по-прежнему кэшируется вечно (immutable) — это безопасно, т.к. имена файлов уникальны для каждой сборки.
2. **Nginx**: принудительный `no-store` для HTML/API и `immutable` для статики (см. `nginx/default.conf`), корректный WebSocket-upgrade через `map $http_upgrade $connection_upgrade`.
3. **Docker**: рабочий `.dockerignore` — в образ больше не попадают `node_modules`, `.next`, `.git` и локальные данные с хоста.
4. **Верификация деплоя**: каждая сборка получает уникальный отпечаток. Проверка того, какая сборка реально работает в проде:
   ```bash
   curl -s https://portal.electrodrivers.ru/api/version
   # -> {"buildId":"80f03f7-...","gitSha":"80f03f7","buildTime":"..."}
   ```
   Отпечаток также встроен в HTML: `<meta name="x-build-id">` и `<meta name="x-build-time">` (видно через «Просмотр кода страницы»). Если после деплоя `buildTime` не поменялся — вы смотрите на старую сборку.

### ⚠️ Однократное действие после этого фикса
Если домен стоит за CDN (Cloudflare и т.п.) — один раз очистите весь кэш (Cloudflare: *Caching → Configuration → Purge Everything*), чтобы вымыть старый HTML, закэшированный до фикса. На устройствах, где сайт открывали раньше, сделайте жёсткое обновление (`Ctrl+Shift+R`). После этого проблема не может повториться.

### Как теперь деплоить
```bash
# Docker (рекомендуется) — деплой с автоматической проверкой версии:
./scripts/deploy.sh            # или ./scripts/deploy.sh --no-cache

# Без Docker — Node.js + PM2 (см. раздел 6.1):
./scripts/deploy-pm2.sh
```

---

## 📑 Содержание
1. [Результаты аудита безопасности (Security Audit)](#1-результаты-аудита-безопасности)
2. [Архитектура Production-стека](#2-архитектура-production-стека)
3. [Подготовка сервера (VPS / VDS)](#3-подготовка-сервера-vps--vds)
4. [Настройка DNS и домена](#4-настройка-dns-и-домена)
5. [Миграция базы данных в PostgreSQL](#5-миграция-базы-данных-в-postgresql)
6. [Деплой через Docker Compose (Рекомендуемый способ)](#6-деплой-через-docker-compose)
7. [Выпуск SSL-сертификатов Let's Encrypt (1 команда)](#7-выпуск-ssl-сертификатов)
8. [Подключение и защита Telegram Bot Webhook](#8-подключение-и-защита-telegram-bot-webhook)
9. [Автоматическое резервное копирование (Backups & Disaster Recovery)](#9-резервное-копирование)
10. [Мониторинг, логирование и чеклист перед запуском](#10-чеклист-перед-запуском)

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
                              │ (HTTPS :443 / HTTP :80)
                              ▼
                     [ Nginx Reverse Proxy ]
                     - SSL Termination (Let's Encrypt)
                     - Rate Limiting & DDOS Filter
                     - Gzip Compression & Static Cache
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       [ Next.js 14 App ]          [ Static Cache / Assets ]
     - Node.js 20 (Alpine Standalone)
     - HMAC Auth & RBAC
     - API Webhooks & CRM
               │
               ▼
     [ PostgreSQL 16 DB ]
     - Persistent Docker Volume
     - Auto-init via 01-init.sql
     - Daily automated pg_dump
```

---

## 3. Подготовка сервера (VPS / VDS)

**Минимальные системные требования:**
- CPU: 2 ядра
- RAM: 2–4 ГБ
- SSD: 20–40 ГБ
- ОС: Ubuntu 22.04 LTS или Ubuntu 24.04 LTS

### Шаг 3.1. Установка Docker и настройка файрвола
```bash
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban openssl

# Установка официального Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# Настройка файрвола UFW
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## 4. Настройка DNS и домена

В панели управления вашего регистратора домена создайте A-записи:

| Тип | Имя хоста | Значение | TTL |
| :--- | :--- | :--- | :--- |
| `A` | `portal` (или `@`) | `IP_СЕРВЕРА` | 300 сек (Auto) |
| `A` | `www` | `IP_СЕРВЕРА` | 300 сек (Auto) |

---

## 5. Запуск портала через Docker Compose

### Шаг 5.1. Клонирование и настройка `.env`
```bash
cd /root/opt/electro_drivers
cp .env.example .env
nano .env
```

Сгенерируйте боевые ключи:
```bash
openssl rand -base64 48   # для SESSION_SECRET
openssl rand -base64 24   # для POSTGRES_PASSWORD
openssl rand -hex 32      # для TELEGRAM_WEBHOOK_SECRET
```

### Шаг 5.2. Запуск базы данных и приложения
```bash
docker compose up -d postgres app
```

### Шаг 5.3. Обновление версии (ВСЕГДА через deploy.sh!)
```bash
./scripts/deploy.sh
```
Скрипт сам: подтянет `origin/main`, пересоберёт образ с отпечатком коммита,
принудительно пересоздаст контейнер и **сверит `/api/version` с задеплоенным
коммитом**. Если версии не совпали — деплой считается проваленным и скрипт
скажет, что делать. Больше никаких «фиксы не доехали до прода».

---

## 6.1. Запуск БЕЗ Docker (Node.js + PM2) — альтернативный способ

Если Docker недоступен или не нужен, портал полноценно работает напрямую на Node.js
(база данных при этом — встроенное JSON-хранилище в `data/`, либо PostgreSQL через `DATABASE_URL`).

```bash
# Однократная подготовка
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm i -g pm2

# Деплой (сборка + запуск + проверка версии)
cd ~/opt/electro_drivers
./scripts/deploy-pm2.sh

# Автозапуск после перезагрузки сервера (однократно)
pm2 startup && pm2 save
```

Nginx на хосте настраивается по образцу `nginx/default.conf` (проксирование на `127.0.0.1:3000`,
замените `proxy_pass http://nextjs_upstream` на `proxy_pass http://127.0.0.1:3000`).

Вариант без PM2 — systemd-юнит: `scripts/electrodrivers.service` (инструкция внутри файла).

---

## 6. Выпуск SSL-сертификатов Let's Encrypt (1 команда)

В проект включен скрипт автоматического выпуска SSL, который создает временный bootstrap-сертификат для старта Nginx, запрашивает реальный сертификат у Let's Encrypt и перезагружает Nginx:

```bash
./scripts/init-ssl.sh portal.electrodrivers.ru admin@electrodrivers.ru
```
*(Замените `portal.electrodrivers.ru` на ваш реальный домен, а `admin@electrodrivers.ru` на ваш email).*

### Запуск всего стека:
```bash
docker compose up -d
```

---

## 7. Вариант запуска без SSL (по HTTP / IP адресу)

Если ваш домен ещё не привязался по DNS, вы можете временно запустить Nginx в чистом HTTP-режиме:
```bash
cp nginx/default-http-only.conf nginx/default.conf
docker compose restart nginx
```
Портал сразу же станет доступен по `http://IP_СЕРВЕРА/` или `http://ВАШ_ДОМЕН/`.

---

## 8. Подключение Telegram Bot Webhook

Выполните один запрос к Telegram Bot API для привязки вебхука с секретным токеном:
```bash
curl -X POST "https://api.telegram.org/bot<ВАШ_TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://portal.electrodrivers.ru/api/crm/webhook",
    "secret_token": "ВАШ_TELEGRAM_WEBHOOK_SECRET",
    "allowed_updates": ["message", "callback_query"]
  }'
```

---

## 9. Автоматическое резервное копирование

Скрипт `scripts/backup-db.sh` производит создание сжатых дампов `pg_dump` с автоматической ротацией (хранение 14 дней).

### Настройка ночных бэкапов в 03:00:
```bash
chmod +x /root/opt/electro_drivers/scripts/backup-db.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /root/opt/electro_drivers/scripts/backup-db.sh >> /var/log/electrodrivers_backup.log 2>&1") | crontab -
```

---

## 10. Чеклист перед публичным запуском

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
