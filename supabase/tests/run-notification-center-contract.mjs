import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(await readFile(new URL('./privacy-fixture-schema.sql', import.meta.url), 'utf8'));
  await db.exec('create role service_role bypassrls; grant usage on schema public,auth to service_role; grant all on all tables in schema public to service_role;');
  for (const name of ['20260907120231_web_push_reminders.sql', '20260908115156_notification_center_test.sql'])
    await db.exec(await readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('./notification_center_contract.sql', import.meta.url), 'utf8'));
  console.log('PASS: test claim permissions, ownership, consent, rate limit and unified badge');
} catch(e) { console.error(e.message, e.code, e.where ?? ''); process.exitCode = 1; }
finally { await db.close(); }
