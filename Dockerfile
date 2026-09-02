# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure essential directories exist
RUN mkdir -p /app/public /app/data

ENV NEXT_TELEMETRY_DISABLED=1

# Отпечаток сборки: .git не попадает в образ (см. .dockerignore),
# поэтому SHA коммита передаётся снаружи (см. scripts/deploy.sh)
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA

RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Ensure app directories exist with proper permissions
RUN mkdir -p /app/public /app/data /app/.next/static && \
    chown -R nextjs:nodejs /app

# 1. Copy standalone bundle FIRST
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# 2. Copy static files into standalone's .next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 3. Copy public and data directories
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
