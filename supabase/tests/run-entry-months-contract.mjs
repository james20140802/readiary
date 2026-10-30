// Local PostgreSQL only: no network, credentials, or persistent database writes.
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
try {
  await db.exec(await readFile(new URL('tests/privacy-fixture-schema.sql', root), 'utf8'));
  for (const name of [
    '20260904000000_reclaim_rls_policies.sql',
    '20261030120000_entry_months.sql',
  ]) {
    await db.exec(await readFile(new URL(`migrations/${name}`, root), 'utf8'));
  }
  await db.exec(await readFile(new URL('tests/entry_months_contract.sql', root), 'utf8'));
  process.stdout.write('PASS: entry months count only the caller’s own entries by entry date\n');
} catch (error) {
  console.error(error.message, error.code, error.where ?? '');
  process.exitCode = 1;
} finally {
  await db.close();
}
