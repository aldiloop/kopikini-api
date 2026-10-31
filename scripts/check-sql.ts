/**
 * Validasi sintaks semua file SQL memakai parser PostgreSQL asli (libpg_query,
 * dikompilasi dari source PostgreSQL) — TANPA butuh server database.
 * Catatan: ini hanya memeriksa sintaks, bukan semantik (tabel/kolom/tipe).
 *
 *   npm run db:check-sql
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parse, loadModule } = require('libpg-query');

async function main() {
  if (typeof loadModule === 'function') await loadModule();
  const root = join(__dirname, '..', 'database');
  let failed = 0;
  for (const dir of ['migrations', 'seeds']) {
    for (const file of readdirSync(join(root, dir)).filter((f) => f.endsWith('.sql')).sort()) {
      const sql = readFileSync(join(root, dir, file), 'utf8');
      try {
        const tree = await parse(sql);
        console.log(`OK   ${dir}/${file} (${tree.stmts.length} statements)`);
      } catch (err) {
        failed++;
        console.error(`FAIL ${dir}/${file}: ${(err as Error).message}`);
      }
    }
  }
  if (failed) process.exit(1);
}

void main();
