// Isolated, in-memory Postgres only. No Supabase credentials or remote connections.
// PGLITE_MODULE=/tmp/readiary-grants-sql/node_modules/@electric-sql/pglite/dist/index.js node supabase/tests/run-api-grants-contract.mjs
//
// 새 기본값(2026-10-30 이후)처럼 public 테이블을 권한 없이 다시 만든 뒤, 권한 마이그레이션만으로
// 각 역할이 프로덕션과 같은 Data API 권한을 얻는지 확인한다. 열 단위 update와 각 테이블을 만든
// 마이그레이션의 권한(book_registration_requests·entry_reflections)은 그 마이그레이션이 맡으므로 여기서 기대하지 않는다.
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);

const CORE = ['books', 'comments', 'entries', 'likes', 'profiles', 'user_books'];
const COLUMN_UPDATE = ['friends', 'notifications'];
const OWN_MIGRATION = ['book_registration_requests', 'entry_reflections', 'feature_rollouts'];
const ALL = [...CORE, ...COLUMN_UPDATE, ...OWN_MIGRATION];
const PRIVS = ['select', 'insert', 'update', 'delete'];

const expected = (role, table) => {
  if (role === 'service_role') return PRIVS;
  if (role === 'authenticated' && CORE.includes(table)) return PRIVS;
  if (role === 'authenticated' && COLUMN_UPDATE.includes(table))
    return ['select', 'insert', 'delete'];
  return [];
};

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    ${ALL.map((t) => `create table public.${t}(id uuid primary key);`).join('\n')}
    -- 옛 기본 권한으로 만든 환경: anon도 받아 두었다가 마이그레이션이 회수하는지 본다
    grant all on all tables in schema public to anon;
  `);
  await db.exec(
    await readFile(new URL('migrations/20261030090000_explicit_table_api_grants.sql', root), 'utf8')
  );
  // 같은 마이그레이션을 두 번 실행해도 결과가 같아야 한다(프로덕션 재실행·재생성 경로)
  await db.exec(
    await readFile(new URL('migrations/20261030090000_explicit_table_api_grants.sql', root), 'utf8')
  );

  const failures = [];
  for (const role of ['anon', 'authenticated', 'service_role']) {
    for (const table of ALL) {
      const { rows } = await db.query(
        `select ${PRIVS.map((p) => `has_table_privilege($1, 'public.${table}', '${p}') as "${p}"`).join(', ')}`,
        [role]
      );
      const actual = PRIVS.filter((p) => rows[0][p]);
      const want = expected(role, table);
      if (actual.join() !== want.join()) {
        failures.push(`${role} on ${table}: expected [${want}] got [${actual}]`);
      }
    }
  }
  if (failures.length) throw new Error(failures.join('\n'));
  process.stdout.write(`Verified explicit Data API grants for ${ALL.length} public tables.\n`);
} catch (error) {
  console.error(error.message, error.code ?? '', error.where ?? '');
  process.exitCode = 1;
} finally {
  await db.close();
}
