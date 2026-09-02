# ВНИМАНИЕ - КРИТИЧЕСКИ ВАЖНО: WORKDIR НЕ ДОЛЖЕН БЫТЬ /app
#
# В проекте есть раздел маршрутов app/app/* (портал живёт на URL /app).
# Если проект лежит в /app, корневой layout оказывается по пути
# /app/app/layout.tsx, а вложенный - /app/app/app/layout.tsx.
# Next.js 14.2.8 при таких путях НЕПРАВИЛЬНО собирает корневой layout:
# он превращается в клиентский компонент-заглушку (ED / Electrodrivers OS...),
# SSR отдаёт HTML без <html>/<head> - в браузере это React #418/#423,
# HierarchyRequestError и белый экран. Это и была причина многомесячной
# проблемы прода. Сборка того же кода в /srv/app полностью здорова
# (проверено побайтовым сравнением чанков).
#
# НИКОГДА не меняйте WORKDIR обратно на /app.

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /srv/app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /srv/app
COPY --from=deps /srv/app/node_modules ./node_modules
COPY . .

# Ensure essential directories exist
RUN mkdir -p /srv/app/public /srv/app/data

ENV NEXT_TELEMETRY_DISABLED=1

# Отпечаток сборки: .git не попадает в образ (см. .dockerignore),
# поэтому SHA коммита передаётся снаружи (см. scripts/deploy.sh)
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA

RUN npm run build

# Страховка: если корневой layout снова собрался заглушкой
# (~150 байт вместо ~11 КБ), сборка образа обязана УПАСТЬ здесь,
# а не доехать до прода белым экраном.
RUN size=$(stat -c %s .next/static/chunks/app/layout-*.js | head -1) && \
    echo "layout chunk size: ${size} bytes" && \
    if [ "$size" -lt 5000 ]; then \
      echo "FATAL: root layout собрался клиентской заглушкой (${size} байт)."; \
      echo "Причина обычно в пути проекта: WORKDIR не должен быть /app."; \
      exit 1; \
    fi

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /srv/app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Ensure app directories exist with proper permissions
RUN mkdir -p /srv/app/public /srv/app/data /srv/app/.next/static && \
    chown -R nextjs:nodejs /srv/app

# 1. Copy standalone bundle FIRST
COPY --from=builder --chown=nextjs:nodejs /srv/app/.next/standalone ./

# 2. Copy static files into standalone's .next/static
COPY --from=builder --chown=nextjs:nodejs /srv/app/.next/static ./.next/static

# 3. Copy public and data directories
COPY --from=builder --chown=nextjs:nodejs /srv/app/public ./public
COPY --from=builder --chown=nextjs:nodejs /srv/app/data ./data

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
