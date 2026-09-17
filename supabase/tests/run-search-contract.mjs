import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(await readFile(new URL('./privacy-fixture-schema.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../migrations/20260915123044_search_library.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../migrations/20260917182948_search_excerpt_permissions.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('./search_library_contract.sql', import.meta.url), 'utf8'));
  process.stdout.write('PASS: owner-only search, literal matching, filters, bounded excerpts and stable pagination\n');
} finally { await db.close(); }
