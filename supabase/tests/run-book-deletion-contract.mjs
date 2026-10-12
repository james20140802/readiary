// Synthetic, isolated PostgreSQL only. Never connects to a remote database.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const root = new URL('../', import.meta.url);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const count = async (table) =>
  Number((await db.query(`select count(*) as n from ${table}`)).rows[0].n);
const actor = async (n) => {
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claims', '{"sub":"${id(n)}","role":"authenticated"}', false);`
  );
};
try {
  await db.exec(await readFile(new URL('tests/privacy-fixture-schema.sql', root), 'utf8'));
  for (const name of [
    '20260904000000_reclaim_rls_policies.sql',
    '20260906063529_explicit_entry_sharing.sql',
    '20260923082615_entry_reflections.sql',
  ]) {
    await db.exec(await readFile(new URL(`migrations/${name}`, root), 'utf8'));
  }
  await db.exec(`
    insert into auth.users values ('${id(1)}'), ('${id(2)}');
    insert into profiles(id,name,nickname,tag) values ('${id(1)}','A','a','0001'), ('${id(2)}','B','b','0002');
    insert into books(id,title) values ('${id(3)}','Synthetic book');
    insert into user_books(id,user_id,book_id) values ('${id(4)}','${id(1)}','${id(3)}'), ('${id(5)}','${id(2)}','${id(3)}');
    insert into friends(user_id,friend_id,status) values ('${id(1)}','${id(2)}','accepted');
    insert into entries(id,user_book_id,date,quote,is_private,shared_at) values
      ('${id(6)}','${id(4)}',current_date,'shared',false,now()),
      ('${id(7)}','${id(4)}',current_date,'private',true,null),
      ('${id(8)}','${id(5)}',current_date,'keep',false,null);
    insert into entry_reflections(id,entry_id,user_id,body) values ('${id(9)}','${id(7)}','${id(1)}','thought');
    insert into comments(id,entry_id,user_id,content) values ('${id(10)}','${id(6)}','${id(2)}','comment');
    insert into comments(id,entry_id,user_id,content,parent_id) values ('${id(11)}','${id(6)}','${id(1)}','reply','${id(10)}');
    insert into likes(user_id,entry_id) values ('${id(2)}','${id(6)}');
    insert into notifications(user_id,actor_id,type,entry_id,comment_id) values ('${id(1)}','${id(2)}','comment','${id(6)}','${id(10)}');
    update profiles set featured_entry_id='${id(6)}',bookmark_user_book_id='${id(4)}' where id='${id(1)}';
  `);
  assert.equal((await db.query(`select * from get_public_entry('${id(6)}')`)).rows.length, 1);
  await actor(2);
  // Bypass the API owner filter deliberately to prove the RLS defense.
  await db.exec(`delete from user_books where id='${id(4)}'`);
  await db.exec('reset role');
  assert.equal(await count('user_books'), 2);
  await actor(1);
  // Force a child failure and prove that the parent and all children roll back.
  await db.exec('reset role');
  await db.exec(`create function fail_delete() returns trigger language plpgsql as $$ begin raise exception 'test failure'; end $$;
    create trigger test_failure before delete on comments for each row execute function fail_delete();`);
  await actor(1);
  await assert.rejects(
    db.exec(`delete from user_books where id='${id(4)}' and user_id='${id(1)}'`)
  );
  await db.exec('reset role');
  assert.equal(await count('entries'), 3);
  assert.equal(await count('user_books'), 2);
  await db.exec('drop trigger test_failure on comments');
  await actor(1);
  await db.exec(`delete from user_books where id='${id(4)}' and user_id='${id(1)}'`);
  await db.exec('reset role');
  assert.equal(await count('user_books'), 1);
  assert.equal(await count('books'), 1);
  assert.equal(await count('entries'), 1);
  for (const table of ['entry_reflections', 'likes', 'comments', 'notifications'])
    assert.equal(await count(table), 0, table);
  const profile = (
    await db.query(
      `select featured_entry_id,bookmark_user_book_id from profiles where id='${id(1)}'`
    )
  ).rows[0];
  assert.deepEqual(profile, { featured_entry_id: null, bookmark_user_book_id: null });
  await db.exec(`set role anon; select set_config('request.jwt.claims','{"role":"anon"}',false);`);
  assert.equal((await db.query(`select * from get_public_entry('${id(6)}')`)).rows.length, 0);
  await db.exec('reset role');
  // Re-register the same catalog book, then replay the old DELETE.
  await db.exec(
    `insert into user_books(id,user_id,book_id) values ('${id(12)}','${id(1)}','${id(3)}')`
  );
  await actor(1);
  await db.exec(`delete from user_books where id='${id(4)}' and user_id='${id(1)}'`);
  assert.equal(await count('user_books'), 2);
  await db.exec(`delete from user_books where id='${id(12)}' and user_id='${id(1)}'`);
  assert.equal(await count('user_books'), 1);
  process.stdout.write(
    'PASS: owner/RLS, cascade, rollback, shared-link revocation, profile cleanup, catalog preservation, empty book, replay/re-registration\n'
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
