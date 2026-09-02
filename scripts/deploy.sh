#!/usr/bin/env bash
# =============================================================================
# deploy.sh — деплой через Docker Compose С ПРОВЕРКОЙ, что прод реально обновился.
#
# Использование:  ./scripts/deploy.sh            # обычный деплой
#                 ./scripts/deploy.sh --no-cache # полная пересборка без кэша
#
# Скрипт решает проблему «фиксы не доезжают до прода»:
#   1. Жёстко синхронизирует код с origin/main.
#   2. Пересобирает образ приложения (с передачей GIT_SHA).
#   3. Принудительно пересоздаёт контейнер (--force-recreate).
#   4. СВЕРЯЕТ /api/version: buildId в проде обязан совпасть с новой сборкой.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

NO_CACHE=""
if [[ "${1:-}" == "--no-cache" ]]; then
  NO_CACHE="--no-cache"
fi

echo "==> 1/5 Синхронизация кода с origin/main"
git fetch origin main
git reset --hard origin/main

echo "==> Бэкап данных перед деплоем"
mkdir -p "${HOME}/electrodrivers_backups"
if docker compose exec -T app cat data/electrodrivers_db.json > "${HOME}/electrodrivers_backups/db_$(date +%F_%H%M%S).json" 2>/dev/null; then
  echo "    Бэкап сохранен в ~/electrodrivers_backups/"
else
  echo "    Контейнер app не запущен — бэкап пропущен"
fi
# Ротация: храним 20 последних бэкапов
ls -t "${HOME}/electrodrivers_backups" 2>/dev/null | tail -n +21 | while read -r f; do rm -f "${HOME}/electrodrivers_backups/${f}"; done

export GIT_SHA="$(git rev-parse --short HEAD)"
echo "    Деплоим коммит: ${GIT_SHA}"

echo "==> 2/5 Сборка образа приложения (GIT_SHA=${GIT_SHA} ${NO_CACHE})"
docker compose build --pull ${NO_CACHE} app

echo "==> 3/5 Перезапуск контейнеров (принудительное пересоздание app)"
docker compose up -d --force-recreate --no-deps app
docker compose up -d nginx postgres

echo "==> 4/5 Ожидание готовности приложения..."
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/version >/dev/null 2>&1; then
    break
  fi
  sleep 2
  if [[ $i -eq 30 ]]; then
    echo "!!! Приложение не поднялось за 60 секунд. Логи:"
    docker compose logs --tail=100 app
    exit 1
  fi
done

echo "==> 5/5 Проверка версии в проде"
VERSION_JSON="$(curl -fsS http://127.0.0.1:3000/api/version)"
echo "    /api/version -> ${VERSION_JSON}"

DEPLOYED_SHA="$(echo "${VERSION_JSON}" | grep -o '"gitSha":"[^"]*"' | cut -d'"' -f4)"
if [[ "${DEPLOYED_SHA}" != "${GIT_SHA}" ]]; then
  echo "!!! ВНИМАНИЕ: в проде gitSha=${DEPLOYED_SHA}, ожидался ${GIT_SHA}."
  echo "!!! Контейнер отдаёт СТАРУЮ сборку. Повторите с --no-cache:"
  echo "!!!   ./scripts/deploy.sh --no-cache"
  exit 1
fi

echo ""
echo "✅ Деплой успешен: прод работает на сборке ${GIT_SHA}."
echo ""
echo "⚠️  Если сайт за CDN (Cloudflare и т.п.) — ОДИН РАЗ очистите кэш"
echo "   (Cloudflare: Caching -> Purge Everything), чтобы вымыть старый HTML,"
echo "   закэшированный до этого фикса. Дальше HTML отдаётся с no-store и"
echo "   проблема не повторится."
echo ""
echo "Проверка с любого устройства:"
echo "   curl -s https://portal.electrodrivers.ru/api/version"
