/**
 * PM2-конфигурация для запуска портала БЕЗ Docker.
 *
 *   npm i -g pm2
 *   ./scripts/deploy-pm2.sh        # сборка + (пере)запуск + проверка версии
 *
 * Полезные команды:
 *   pm2 status
 *   pm2 logs electrodrivers
 *   pm2 restart electrodrivers
 *   pm2 startup && pm2 save        # автозапуск после перезагрузки сервера
 */
module.exports = {
  apps: [
    {
      name: 'electrodrivers',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        // При использовании PostgreSQL раскомментируйте и заполните:
        // DATABASE_URL: 'postgresql://electro_admin:PASSWORD@127.0.0.1:5432/electrodrivers_db',
        SESSION_SECRET: process.env.SESSION_SECRET || 'electrodrivers_super_secret_session_key_production_2026',
      },
    },
  ],
};
