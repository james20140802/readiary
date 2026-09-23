import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
let db: PGlite;
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
async function as(user: string, sql = 'select entry_reflections_enabled() as enabled') {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${user}',false)`
  );
  return db.query<{ enabled: boolean }>(sql);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth, public to authenticated,anon;
    create table entry_reflections(id integer, user_id uuid default auth.uid());
    alter table entry_reflections enable row level security;
    grant select,insert,update,delete on entry_reflections to authenticated;
    create policy owner on entry_reflections to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());`);
  await db.exec(
    readFileSync(
      new URL(
        '../../../supabase/migrations/20260923082632_entry_reflections_rollout.sql',
        import.meta.url
      ),
      'utf8'
    )
  );
}, 20000);
afterAll(async () => {
  await db?.close();
});
it('defaults off, allows only selected accounts, and gates direct writes without weakening ownership', async () => {
  expect((await as(owner)).rows[0].enabled).toBe(false);
  await expect(as(owner, 'select * from feature_rollouts')).rejects.toThrow(/permission denied/);
  await expect(as(owner, 'insert into entry_reflections(id) values(1)')).rejects.toThrow(
    /row-level security/
  );
  await db.exec(
    `reset role;update feature_rollouts set enabled=true,user_ids=array['${owner}']::uuid[]`
  );
  expect((await as(owner)).rows[0].enabled).toBe(true);
  expect((await as(other)).rows[0].enabled).toBe(false);
  await as(owner, 'insert into entry_reflections(id) values(1)');
  await expect(as(owner, `insert into entry_reflections values(2,'${other}')`)).rejects.toThrow(
    /row-level security/
  );
  await expect(as(other, 'insert into entry_reflections(id) values(3)')).rejects.toThrow(
    /row-level security/
  );
  await db.exec('reset role;update feature_rollouts set enabled=false');
  expect((await as(owner)).rows[0].enabled).toBe(false);
  expect((await as(owner, 'update entry_reflections set id=4 returning *')).rows).toHaveLength(0);
  expect((await as(owner, 'delete from entry_reflections returning *')).rows).toHaveLength(0);
  expect((await as(owner, 'select * from entry_reflections')).rows).toHaveLength(1);
});
it('uses stable nested percentage cohorts, rejects anonymous and unknown configuration', async () => {
  await db.exec("reset role;update feature_rollouts set enabled=true,user_ids='{}',percentage=20");
  // Separate statements force each auth.uid() evaluation to see the intended user.
  const collect = async () => {
    const ids: number[] = [];
    for (let i = 1; i <= 100; i++)
      if ((await as(`${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`)).rows[0].enabled)
        ids.push(i);
    return ids;
  };
  const first = await collect();
  expect(first.length).toBeGreaterThan(0);
  expect(first.length).toBeLessThan(100);
  expect(await collect()).toEqual(first);
  await db.exec('reset role;update feature_rollouts set percentage=50');
  const expanded = await collect();
  expect(first.every((id) => expanded.includes(id))).toBe(true);
  await db.exec('reset role;update feature_rollouts set percentage=100');
  expect((await as(other)).rows[0].enabled).toBe(true);
  expect((await as('')).rows[0].enabled).toBe(false);
  await db.exec('reset role;set role anon');
  await expect(db.query('select entry_reflections_enabled()')).rejects.toThrow(/permission denied/);
  await db.exec('reset role;delete from feature_rollouts');
  expect((await as(owner)).rows[0].enabled).toBe(false);
});
