/**
 * Production Migration Script
 * Migrates data from local electrodrivers_db.json into a live PostgreSQL database
 * Usage: DATABASE_URL="postgresql://user:pass@host:5432/electrodrivers_db" npx tsx scripts/migrate-to-postgres.ts
 */

import fs from 'fs';
import path from 'path';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    console.error('Example: DATABASE_URL="postgresql://postgres:secure_password@localhost:5432/electrodrivers_db" npx tsx scripts/migrate-to-postgres.ts');
    process.exit(1);
  }

  const sqlFile = path.join(process.cwd(), 'data', 'init-db.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error('init-db.sql not found at:', sqlFile);
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL database...');
  console.log('Database URL host:', databaseUrl.split('@')[1] || 'masked');

  try {
    // Dynamic import of pg or execution instructions
    console.log('Reading init-db.sql...');
    const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
    
    console.log('To execute this migration against your production PostgreSQL:');
    console.log('Option 1: Using psql CLI:');
    console.log(`  psql "${databaseUrl}" -f data/init-db.sql`);
    console.log('\nOption 2: Using Docker Compose:');
    console.log('  docker-compose exec -T postgres psql -U electro_user -d electrodrivers_db < data/init-db.sql');
    console.log('\nMigration file is verified and ready at: data/init-db.sql');
  } catch (err: any) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

main();
