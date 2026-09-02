#!/usr/bin/env bash
# =============================================================================
# deploy-pm2.sh — деплой БЕЗ Docker: Node.js + PM2 (+ ваш nginx на хосте).
#
# Требования (однократно):
#   - Node.js 20+  (https://nodejs.org)
#   - npm i -g pm2
#
# Использование:  ./scripts/deploy-pm2.sh
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1/5 Синхронизация кода с origin/main"
git fetch origin main
git reset --hard origin/main
GIT_SHA="$(git rev-parse --short HEAD)"

echo "==> 2/5 Чистая установка зависимостей"
npm ci

echo "==> 3/5 Production-сборка (коммит ${GIT_SHA})"
rm -rf .next
npm run build

echo "==> 4/5 (Пере)запуск через PM2"
pm2 startOrReload ecosystem.config.js --update-env
pm2 save

echo "==> 5/5 Проверка версии"
sleep 3
VERSION_JSON="$(curl -fsS http://127.0.0.1:3000/api/version)"
echo "    /api/version -> ${VERSION_JSON}"

DEPLOYED_SHA="$(echo "${VERSION_JSON}" | grep -o '"gitSha":"[^"]*"' | cut -d'"' -f4)"
if [[ "${DEPLOYED_SHA}" != "${GIT_SHA}" ]]; then
  echo "!!! В проде gitSha=${DEPLOYED_SHA}, ожидался ${GIT_SHA} — процесс не перезапустился."
  echo "!!! Выполните: pm2 delete electrodrivers && ./scripts/deploy-pm2.sh"
  exit 1
fi

echo ""
echo "✅ Готово: PM2 запустил сборку ${GIT_SHA} на порту 3000."
echo "   Автозапуск после ребута сервера (однократно): pm2 startup"
