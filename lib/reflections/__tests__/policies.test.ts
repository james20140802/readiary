import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
const owner = '11111111-1111-4111-8111-111111111111';
const friend = '22222222-2222-4222-8222-222222222222';
const stranger = '33333333-3333-4333-8333-333333333333';
const book = '44444444-4444-4444-8444-444444444444';
const entry = '55555555-5555-4555-8555-555555555555';
const privateId = '66666666-6666-4666-8666-666666666666';
const publicId = '77777777-7777-4777-8777-777777777777';
let db: PGlite;
async function as(user: string, sql: string) {
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${user}',false);`
  );
  return db.query<Record<string, unknown>>(sql);
}
const rows = () => `select id,body from entry_reflections order by id`;
describe('entry reflections migration against PostgreSQL RLS', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
   create role anon;create role authenticated;
   create schema auth; create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
   create table public.user_books(id uuid primary key,user_id uuid references auth.users(id));
   create table public.entries(id uuid primary key,user_book_id uuid references user_books(id) on delete cascade,is_private boolean not null default false);
   create table public.friends(user_id uuid,friend_id uuid,status text);
   create function public.is_friend_with(other uuid) returns boolean language sql stable security invoker as $$ select exists(select 1 from friends where status='accepted' and ((user_id=auth.uid() and friend_id=other) or (friend_id=auth.uid() and user_id=other))) $$;
   grant select on entries,user_books,friends to authenticated;
   alter table entries enable row level security;
   create policy entries_read on entries for select to authenticated using(exists(select 1 from user_books ub where ub.id=user_book_id and (ub.user_id=auth.uid() or (not entries.is_private and is_friend_with(ub.user_id)))));
   insert into auth.users values('${owner}'),('${friend}'),('${stranger}');
   insert into user_books values('${book}','${owner}');insert into entries values('${entry}','${book}',false);
   insert into friends values('${owner}','${friend}','accepted');
  `);
    await db.exec(
      readFileSync(
        new URL(
          '../../../supabase/migrations/20260923082615_entry_reflections.sql',
          import.meta.url
        ),
        'utf8'
      )
    );
    await db.exec(
      readFileSync(
        new URL(
          '../../../supabase/migrations/20260923084120_reflection_private_edits.sql',
          import.meta.url
        ),
        'utf8'
      )
    );
  }, 20000);
  afterAll(async () => {
    await db?.close();
  });
  it('defaults to private, preserves original date, and hides private thoughts from friends', async () => {
    await as(
      owner,
      `insert into entry_reflections(id,entry_id,body) values('${privateId}','${entry}','오늘의 생각')`
    );
    await as(
      owner,
      `insert into entry_reflections(id,entry_id,body,is_private) values('${publicId}','${entry}',repeat('가',500),false)`
    );
    const own = await as(owner, `select * from entry_reflections order by id`);
    expect(own.rows).toHaveLength(2);
    expect(own.rows[0]).toMatchObject({ is_private: true, user_id: owner });
    expect(own.rows[0].created_at).toEqual(own.rows[0].updated_at);
    expect((await as(friend, rows())).rows).toHaveLength(1);
    expect((await as(stranger, rows())).rows).toHaveLength(0);
  });
  it('returns visible counts and bounded previews; rejects more than 100 IDs', async () => {
    const result = await as(
      friend,
      `select * from get_entry_reflection_summaries(array['${entry}']::uuid[])`
    );
    expect(Number(result.rows[0].total)).toBe(1);
    expect((result.rows[0].latest as { body: string }).body).toHaveLength(240);
    await expect(
      as(
        owner,
        `select * from get_entry_reflection_summaries(array_fill('${entry}'::uuid,array[101]))`
      )
    ).rejects.toThrow('At most 100');
  });
  it('rejects friend writes and immutable-column tampering at the database boundary', async () => {
    await expect(
      as(
        friend,
        `insert into entry_reflections(id,entry_id,body) values('${stranger}','${entry}','침입')`
      )
    ).rejects.toThrow();
    expect(
      (
        await as(
          friend,
          `update entry_reflections set body='변경' where id='${publicId}' returning id`
        )
      ).rows
    ).toHaveLength(0);
    expect(
      (await as(friend, `delete from entry_reflections where id='${publicId}' returning id`)).rows
    ).toHaveLength(0);
    for (const column of ['entry_id', 'user_id', 'created_at', 'updated_at']) {
      await expect(
        as(owner, `update entry_reflections set ${column}=${column} where id='${privateId}'`)
      ).rejects.toThrow('permission denied');
    }
    await expect(
      as(
        owner,
        `insert into entry_reflections(id,entry_id,user_id,body) values('${stranger}','${entry}','${friend}','위조')`
      )
    ).rejects.toThrow('permission denied');
  });
  it('enforces length, duplicate IDs and optimistic versions without moving creation time', async () => {
    await expect(
      as(
        owner,
        `insert into entry_reflections(id,entry_id,body) values('${privateId}','${entry}','중복')`
      )
    ).rejects.toThrow('duplicate');
    for (const body of ["' '", "repeat('가',10001)"])
      await expect(
        as(
          owner,
          `insert into entry_reflections(id,entry_id,body) values('${stranger}','${entry}',${body})`
        )
      ).rejects.toThrow('check constraint');
    const before = (
      await as(
        owner,
        `select created_at::text,updated_at::text from entry_reflections where id='${privateId}'`
      )
    ).rows[0];
    const updated = await as(
      owner,
      `update entry_reflections set body='새롭게 읽는다' where id='${privateId}' and updated_at='${before.updated_at}' returning created_at::text,updated_at::text`
    );
    expect(updated.rows[0].created_at).toBe(before.created_at);
    expect(updated.rows[0].updated_at).not.toBe(before.updated_at);
    expect(
      (
        await as(
          owner,
          `update entry_reflections set body='오래된 수정' where id='${privateId}' and updated_at='${before.updated_at}' returning id`
        )
      ).rows
    ).toHaveLength(0);
  });
  it('original privacy and friendship changes immediately revoke visibility, then restore only selected public thoughts', async () => {
    await db.exec(`reset role; update entries set is_private=true;`);
    expect((await as(friend, rows())).rows).toHaveLength(0);
    expect((await as(owner, rows())).rows).toHaveLength(2);
    const forced = await as(
      owner,
      `update entry_reflections set is_private=false where id='${privateId}' returning is_private`
    );
    expect(forced.rows[0].is_private).toBe(true);
    await expect(
      as(
        owner,
        `insert into entry_reflections(id,entry_id,body,is_private) values('${stranger}','${entry}','공개',false)`
      )
    ).rejects.toThrow();
    const edited = await as(
      owner,
      `update entry_reflections set body='숨겨진 공개 생각 수정',is_private=false where id='${publicId}' returning is_private`
    );
    expect(edited.rows[0].is_private).toBe(true);
    await db.exec(
      `reset role; update entries set is_private=false; update friends set status='pending';`
    );
    expect((await as(friend, rows())).rows).toHaveLength(0);
    await db.exec(`reset role;update friends set status='accepted';`);
    expect((await as(friend, rows())).rows).toHaveLength(0);
  });
  it('anonymous roles cannot read thoughts or execute summaries, even for shared originals', async () => {
    await db.exec('reset role;set role anon;');
    await expect(db.query(rows())).rejects.toThrow('permission denied');
    await expect(
      db.query(`select * from get_entry_reflection_summaries(array['${entry}']::uuid[])`)
    ).rejects.toThrow('permission denied');
  });
  it('individual deletion preserves the original; deleting a book cascades original and remaining thoughts', async () => {
    await as(owner, `delete from entry_reflections where id='${privateId}'`);
    expect((await as(owner, `select id from entries`)).rows).toHaveLength(1);
    expect((await as(owner, rows())).rows).toHaveLength(1);
    await db.exec(`reset role;delete from user_books where id='${book}';`);
    expect((await db.query(rows())).rows).toHaveLength(0);
    expect((await db.query('select id from entries')).rows).toHaveLength(0);
  });
});
