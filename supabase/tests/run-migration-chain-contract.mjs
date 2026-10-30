// Isolated, in-memory Postgres only. No Supabase credentials or remote connections.
// PGLITE_MODULE=/tmp/readiary-grants-sql/node_modules/@electric-sql/pglite/dist/index.js \
//   node supabase/tests/run-migration-chain-contract.mjs
//
// "빈 DB + 저장소 마이그레이션 전체"가 2026-10-30 프로덕션 public 스키마를 재현하는지 확인한다.
// 1) Supabase가 제공하는 것만 최소로 스텁한다(역할 3개, auth.users/auth.uid(), storage 버킷·정책에
//    필요한 만큼의 storage 스키마). pg_cron·pg_net 등 저장소 마이그레이션이 쓰지 않는 확장은 스텁하지 않는다
//    (실제로 쓰는 마이그레이션이 없다 — 프로덕션 이력의 enable_push_cron_extensions는 저장소에 없다. 아래 참고).
// 2) 2026-10-30 이후 기본값처럼 public 스키마 기본 권한을 전부 회수한 뒤 supabase/migrations/*.sql을
//    파일명 순서로 전부 적용한다(이 디렉터리에 있는 모든 마이그레이션 — 추가되는 새 파일도 자동으로 포함된다).
// 3) 결과 스키마(테이블·컬럼·제약·인덱스·RLS 활성화·정책·함수 시그니처·역할별 테이블 권한)를
//    supabase/tests/fixtures/prod-public-schema.json(2026-10-30 프로덕션 읽기 전용 조회 결과)과 비교한다.
//
// 받아들이는 차이(모두 docs/operations/supabase-api-grants.md에도 적음):
//   - 테이블 권한: TRUNCATE·TRIGGER·REFERENCES·MAINTAIN은 비교하지 않는다. 클라이언트가 쓰지 않고,
//     2026-10-30 이전에 기본 권한으로 만들어진 프로덕션 테이블에는 남아 있지만 이 저장소는 주지 않는다
//     (20261030090000_explicit_table_api_grants.sql의 의도).
//   - storage 스키마: 버킷·정책의 정확한 일치는 보지 않는다. private_profile_images 마이그레이션이
//     적용되는지(= storage.objects/storage.buckets가 그 DDL을 받아들이는지)만 스모크로 확인한다.
//   - rls_auto_enable: Supabase 플랫폼이 붙이는 이벤트 트리거 함수. 앱 마이그레이션이 만들지 않고
//     PGlite도 이벤트 트리거를 지원하지 않아 애초에 만들어지지 않는다 — fixtures에도 없다.
//   - 함수 본문(정의 SQL)의 글자 단위 일치는 보지 않는다. 이름·인자 시그니처만 비교한다.
//   - pg_cron으로 예약된 함수 실행(web push 발송 트리거)은 확장·cron 작업 유무를 보지 않는다.
//     저장소 마이그레이션은 cron.schedule을 호출하지 않는다(별도 운영 설정 — 이 테스트의 범위 밖).

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);

const CRUD = ['select', 'insert', 'update', 'delete'];

function normDefault(expr) {
  if (expr == null) return null;
  return String(expr).trim().replace(/\s+/g, ' ');
}

function normDef(def) {
  return String(def).trim().replace(/\s+/g, ' ');
}

function diffSets(label, actual, expected) {
  const a = new Set(actual);
  const e = new Set(expected);
  const missing = [...e].filter((x) => !a.has(x));
  const extra = [...a].filter((x) => !e.has(x));
  const problems = [];
  if (missing.length) problems.push(`${label}: missing ${JSON.stringify(missing)}`);
  if (extra.length) problems.push(`${label}: unexpected extra ${JSON.stringify(extra)}`);
  return problems;
}

try {
  const fixture = JSON.parse(
    await readFile(new URL('tests/fixtures/prod-public-schema.json', root), 'utf8')
  );

  // 1) Supabase가 제공하는 것만 최소로 스텁한다.
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create schema storage;
    create table auth.users (
      id uuid primary key,
      email text,
      email_confirmed_at timestamptz
    );
    create function auth.uid() returns uuid language sql stable as $$
      select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
    $$;
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1]
    $$;
    create table storage.buckets (
      id text primary key, public boolean, file_size_limit bigint, allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text references storage.buckets,
      name text not null,
      metadata jsonb,
      owner uuid
    );
    insert into storage.buckets values ('profiles', true, 5242880, array['image/jpeg','image/png','image/webp']);
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to anon, authenticated;
    -- 2026-10-30 이후 기본값: public에 새로 만든 객체에 역할 권한을 자동으로 주지 않는다.
    alter default privileges in schema public revoke all on tables from anon, authenticated;
  `);

  // 2) 저장소 마이그레이션 전체를 파일명 순서로 적용한다.
  const files = (await readdir(new URL('migrations/', root)))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    try {
      await db.exec(await readFile(new URL(`migrations/${file}`, root), 'utf8'));
    } catch (error) {
      throw new Error(
        `migration ${file} failed to apply on an empty database: ${error.message} ${error.code ?? ''} ${error.where ?? ''}`
      );
    }
  }

  const problems = [];

  // 3) 테이블 존재 여부
  const { rows: tableRows } = await db.query(`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `);
  const actualTables = tableRows.map((r) => r.table_name);
  problems.push(...diffSets('tables', actualTables, fixture.tables));

  // 4) 컬럼(이름·타입·nullable·default)
  for (const table of fixture.tables) {
    const { rows } = await db.query(
      `select column_name, data_type, is_nullable, column_default
       from information_schema.columns
       where table_schema = 'public' and table_name = $1
       order by ordinal_position`,
      [table]
    );
    const actual = rows.map((r) => [
      r.column_name,
      r.data_type,
      r.is_nullable,
      normDefault(r.column_default),
    ]);
    const expected = (fixture.columns[table] ?? []).map((c) => [c[0], c[1], c[2], normDefault(c[3])]);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      problems.push(
        `columns[${table}]: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`
      );
    }
  }

  // 5) 제약(이름·종류·정의) — 정의는 공백만 정규화해 비교한다.
  for (const table of fixture.tables) {
    const { rows } = await db.query(
      `select conname, contype, pg_get_constraintdef(oid) as def
       from pg_constraint
       where connamespace = 'public'::regnamespace and conrelid = $1::regclass
         and contype <> 'n' -- PG17+는 NOT NULL도 pg_constraint에 담는다. 프로덕션(구형 PG)과 맞추려면 제외한다.
       order by contype, conname`,
      [`public.${table}`]
    );
    const actual = rows
      .map((r) => [r.conname, r.contype, normDef(r.def)])
      .sort((a, b) => a[0].localeCompare(b[0]));
    const expected = (fixture.constraints[table] ?? [])
      .map((c) => [c[0], c[1], normDef(c[2])])
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      problems.push(
        `constraints[${table}]: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`
      );
    }
  }

  // 6) 인덱스 이름(정의 비교는 제약으로 이미 충분히 덮이는 유니크 인덱스를 빼면 중복이라 이름만 본다)
  for (const table of fixture.tables) {
    const { rows } = await db.query(
      `select indexname from pg_indexes where schemaname = 'public' and tablename = $1 order by indexname`,
      [table]
    );
    const actual = rows.map((r) => r.indexname);
    const expected = [...(fixture.indexes[table] ?? [])].sort();
    problems.push(...diffSets(`indexes[${table}]`, actual, expected));
  }

  // 7) RLS 활성화
  const { rows: rlsRows } = await db.query(
    `select relname, relrowsecurity from pg_class
     where relnamespace = 'public'::regnamespace and relkind = 'r'`
  );
  const rlsOn = new Set(rlsRows.filter((r) => r.relrowsecurity).map((r) => r.relname));
  problems.push(...diffSets('rlsEnabled', [...rlsOn], fixture.rlsEnabled));

  // 8) 테이블 권한 — TRUNCATE/TRIGGER/REFERENCES/MAINTAIN은 의도적으로 보지 않는다(위 주석).
  for (const table of fixture.tables) {
    for (const role of ['anon', 'authenticated', 'service_role']) {
      const { rows } = await db.query(
        `select ${CRUD.map((p) => `has_table_privilege($1, 'public.' || $2, '${p}') as "${p}"`).join(', ')}`,
        [role, table]
      );
      const actual = CRUD.filter((p) => rows[0][p]);
      const expected = [...(fixture.coreGrants[table]?.[role] ?? [])].sort();
      if (JSON.stringify(actual.sort()) !== JSON.stringify(expected)) {
        problems.push(
          `grants[${table}][${role}]: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`
        );
      }
    }
  }

  // 9) 정책(이름·명령·대상 역할) — qual/with_check 본문은 비교하지 않는다(식 포매팅이 PG 버전마다 흔들린다).
  const { rows: policyRows } = await db.query(
    `select tablename, policyname, cmd, roles::text as roles
     from pg_policies where schemaname = 'public'
     order by tablename, policyname`
  );
  const actualPolicies = policyRows.map((r) => [r.tablename, r.policyname, r.cmd, r.roles]);
  const expectedPolicies = [...fixture.policies].sort((a, b) =>
    a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])
  );
  if (JSON.stringify(actualPolicies) !== JSON.stringify(expectedPolicies)) {
    problems.push(
      `policies: expected ${JSON.stringify(expectedPolicies)} got ${JSON.stringify(actualPolicies)}`
    );
  }

  // 10) 함수 시그니처(이름 + 인자) — rls_auto_enable처럼 Supabase가 붙이는 함수는 저장소가 만들지 않으므로
  //     자연히 나타나지 않는다.
  const { rows: fnRows } = await db.query(`
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
    order by p.proname, args
  `);
  const actualFns = fnRows.map((r) => [r.proname, r.args]).sort((a, b) => a[0].localeCompare(b[0]));
  const expectedFns = [...fixture.functions].sort((a, b) => a[0].localeCompare(b[0]));
  if (JSON.stringify(actualFns) !== JSON.stringify(expectedFns)) {
    problems.push(`functions: expected ${JSON.stringify(expectedFns)} got ${JSON.stringify(actualFns)}`);
  }

  if (problems.length) {
    throw new Error(`Schema mismatch vs ${fixture._captured}\n` + problems.join('\n'));
  }

  process.stdout.write(
    `Verified empty DB + full migration chain (${files.length} files) reproduces the 2026-10-30 production public schema: ${fileURLToPath(root)}\n`
  );
} catch (error) {
  console.error(error.message, error.code ?? '', error.where ?? '');
  process.exitCode = 1;
} finally {
  await db.close();
}
