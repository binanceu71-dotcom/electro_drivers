#!/usr/bin/env node
/**
 * Генерирует lib/build-info.json перед каждой сборкой (см. "prebuild" в package.json).
 *
 * Назначение: уникальный отпечаток сборки, по которому можно ОДНОЗНАЧНО
 * проверить, какая именно сборка крутится в проде:
 *   - в HTML: <meta name="x-build-id" ...> / <meta name="x-build-time" ...>
 *   - по HTTP: GET /api/version
 *
 * Это защита от главной причины «неисправимого белого экрана»:
 * прод продолжал отдавать старую сборку (кэш CDN / незаребилженный Docker-образ),
 * и было невозможно понять, применились ли фиксы.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function tryGitSha() {
  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

const now = new Date();
const gitSha = process.env.GIT_SHA || tryGitSha() || 'unknown';
const buildTime = now.toISOString();
const buildId = `${gitSha}-${now.getTime().toString(36)}`;

const info = { buildId, gitSha, buildTime };

const outPath = path.join(__dirname, '..', 'lib', 'build-info.json');
fs.writeFileSync(outPath, JSON.stringify(info, null, 2) + '\n', 'utf-8');

console.log(`[build-info] ${JSON.stringify(info)}`);
