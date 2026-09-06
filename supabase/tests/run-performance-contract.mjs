// Local PostgreSQL only: no network, credentials, or persistent database writes.
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
try {
  await db.exec(await readFile(new URL('tests/privacy-fixture-schema.sql', root), 'utf8'));
  for (const name of [
    '20260904000000_reclaim_rls_policies.sql',
    '20260906111737_page_loading_rpcs.sql',
    '20260906112509_rpc_quote_whitespace.sql',
  ]) {
    await db.exec(await readFile(new URL(`migrations/${name}`, root), 'utf8'));
  }
  await db.exec(await readFile(new URL('tests/performance_contract.sql', root), 'utf8'));
  process.stdout.write('PASS: page RPC aggregates, pagination, recall, and caller RLS isolation\n');
} catch (error) {
  console.error(error.message, error.code, error.where ?? '');
  process.exitCode = 1;
} finally {
  await db.close();
}
