import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, it, expect } from 'vitest';
let db: PGlite;
const owner = '11111111-1111-4111-8111-111111111111',
  other = '22222222-2222-4222-8222-222222222222';
const entry = '33333333-3333-4333-8333-333333333333',
  book = '44444444-4444-4444-8444-444444444444';
const thought = '55555555-5555-4555-8555-555555555555',
  second = '66666666-6666-4666-8666-666666666666';
async function as(user: string, sql: string) {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${user}',false)`
  );
  return db.query<Record<string, unknown>>(sql);
}
const mutate = (patch: string | null, count: number | null = null, remove = false) =>
  `select mutate_entry_with_reflection_ack('${entry}',${patch === null ? 'null' : `'${patch}'::jsonb`},${remove},${count ?? 'null'}) as result`;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
 create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to authenticated,anon;
 create table user_books(id uuid primary key,user_id uuid references auth.users(id));
 create table entries(id uuid primary key,user_book_id uuid references user_books(id),quote text,note text,date date,from_page integer,to_page integer,is_private boolean not null default false);
 create function is_friend_with(uuid) returns boolean language sql as $$select false$$;
 grant select on user_books to authenticated;grant select,update,delete on entries to authenticated;
 alter table entries enable row level security;
 create policy owner on entries to authenticated using(exists(select 1 from user_books where id=entries.user_book_id and user_id=auth.uid())) with check(exists(select 1 from user_books where id=entries.user_book_id and user_id=auth.uid()));
 insert into auth.users values('${owner}'),('${other}');insert into user_books values('${book}','${owner}');
 insert into entries(id,user_book_id,quote,date) values('${entry}','${book}','원문','2026-09-23');`);
  for (const file of [
    '20260923082615_entry_reflections',
    '20260923082632_entry_reflections_rollout',
    '20260923084120_reflection_private_edits',
    '20260923085735_entry_reflection_acknowledgements',
  ])
    await db.exec(
      readFileSync(new URL(`../../../supabase/migrations/${file}.sql`, import.meta.url), 'utf8')
    );
  await db.exec(`update feature_rollouts set enabled=true,user_ids=array['${owner}']::uuid[]`);
  await as(
    owner,
    `insert into entry_reflections(id,entry_id,body,is_private) values('${thought}','${entry}','생각',false)`
  );
}, 20000);
afterAll(async () => {
  await db?.close();
});
it('blocks stale public edits without acknowledgement and preserves the private original', async () => {
  await as(owner, `update entries set is_private=true where id='${entry}'`);
  const result = await as(owner, mutate('{"quote":"오래된 폼","is_private":false}'));
  expect(result.rows[0].result).toMatchObject({ confirmation_required: true, count: 1 });
  expect((await as(owner, `select quote,is_private from entries`)).rows[0]).toMatchObject({
    quote: '원문',
    is_private: true,
  });
  expect(
    (await as(owner, mutate('{"quote":"확인한 수정","is_private":false}', 1))).rows[0].result
  ).toEqual({ id: entry });
  // Lost response retry does not require a second confirmation after the committed transition.
  expect(
    (await as(owner, mutate('{"quote":"확인한 수정","is_private":false}'))).rows[0].result
  ).toEqual({ id: entry });
});
it('blocks old-client deletes and a changed count without cascading', async () => {
  expect((await as(owner, mutate(null, null, true))).rows[0].result).toMatchObject({
    confirmation_required: true,
    count: 1,
  });
  await as(
    owner,
    `insert into entry_reflections(id,entry_id,body) values('${second}','${entry}','추가 생각')`
  );
  expect((await as(owner, mutate(null, 1, true))).rows[0].result).toMatchObject({
    confirmation_required: true,
    count: 2,
  });
  expect((await as(owner, 'select id from entry_reflections')).rows).toHaveLength(2);
});
it('does not let another account mutate the entry, and rejects identity patching', async () => {
  expect((await as(other, mutate(null, 2, true))).rows[0].result).toEqual({ not_found: true });
  await expect(as(owner, mutate(`{"user_book_id":"${other}"}`))).rejects.toThrow(
    'Invalid entry patch'
  );
});
it('serializes private edits with the original and cascades only after the current count is acknowledged', async () => {
  await as(owner, `update entries set is_private=true where id='${entry}'`);
  const edited = await as(
    owner,
    `update entry_reflections set body='다시 쓴 생각',is_private=false where id='${thought}' returning is_private`
  );
  expect(edited.rows[0].is_private).toBe(true);
  // No public thoughts remain: legacy edit can safely republish without a checkbox.
  expect((await as(owner, mutate('{"is_private":false}'))).rows[0].result).toEqual({ id: entry });
  expect((await as(owner, mutate(null, 2, true))).rows[0].result).toEqual({ id: entry });
  expect((await as(owner, 'select id from entry_reflections')).rows).toHaveLength(0);
  expect((await as(owner, mutate(null, 2, true))).rows[0].result).toEqual({ not_found: true });
  await db.exec('reset role;set role anon');
  await expect(db.query(mutate(null, 2, true))).rejects.toThrow(/permission denied/);
});
