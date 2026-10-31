/**
 * Menjalankan file SQL ke PostgreSQL memakai DATABASE_URL (tanpa perlu psql).
 *
 *   npm run db:migrate   -> database/migrations/*.sql (urut nama, sekali saja)
 *   npm run db:seed      -> database/seeds/*.sql      (idempoten)
 *
 * Migrasi dicatat di tabel `schema_migrations` agar tidak dijalankan dua kali.
 * DATABASE_URL dibaca dari environment atau file .env (tidak ada default di kode).
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

function loadDotEnv() {
  const file = join(__dirname, '..', '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

async function main() {
  const mode = process.argv[2];
  if (mode !== 'migrate' && mode !== 'seed') {
    console.error('Usage: ts-node scripts/run-sql.ts <migrate|seed>');
    process.exit(2);
  }
  loadDotEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set (copy .env.example to .env).');
    process.exit(2);
  }

  const dir = join(__dirname, '..', 'database', mode === 'migrate' ? 'migrations' : 'seeds');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    if (mode === 'migrate') {
      await client.query(
        `CREATE TABLE IF NOT EXISTS schema_migrations (
           filename TEXT PRIMARY KEY,
           applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
      );
    }
    for (const file of files) {
      if (mode === 'migrate') {
        const { rowCount } = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
        if (rowCount) {
          console.log(`skip ${file} (already applied)`);
          continue;
        }
      }
      const sql = readFileSync(join(dir, file), 'utf8');
      // Seed mengelola transaksinya sendiri (BEGIN/COMMIT di dalam file).
      if (mode === 'seed') {
        try {
          await client.query(sql);
        } catch (err) {
          await client.query('ROLLBACK').catch(() => undefined);
          throw new Error(`${file}: ${(err as Error).message}`);
        }
        console.log(`done ${file}`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`done ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`${file}: ${(err as Error).message}`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`ERROR ${err.message}`);
  process.exit(1);
});
