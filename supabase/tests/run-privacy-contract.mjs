// Isolated, in-memory Postgres only. No Supabase credentials or remote connections.
// PGLITE_MODULE=/tmp/readiary-pr91-sql/node_modules/@electric-sql/pglite/dist/index.js node supabase/tests/run-privacy-contract.mjs
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
try {
  await db.exec(await readFile(new URL('tests/privacy-fixture-schema.sql', root), 'utf8'));
  for (const name of [
    '20260904000000_reclaim_rls_policies.sql',
    '20260906063232_private_profile_images.sql',
    '20260906063529_explicit_entry_sharing.sql',
  ]) {
    await db.exec(await readFile(new URL(`migrations/${name}`, root), 'utf8'));
  }
  const result = await db.exec(await readFile(new URL('tests/privacy_contract.sql', root), 'utf8'));
  process.stdout.write(JSON.stringify(result.at(-1).rows) + '\n');
  process.stdout.write(
    `Verified local PostgreSQL RLS and sharing contract: ${fileURLToPath(root)}\n`
  );
} catch (error) {
  console.error(error.message, error.code, error.where ?? '');
  process.exitCode = 1;
} finally {
  await db.close();
}
