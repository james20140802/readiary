// 메모리 안의 임시 Postgres만 사용한다. Supabase 접속 정보나 원격 연결을 쓰지 않는다.
// 마이그레이션 전체를 적용한 뒤 댓글·좋아요·알림의 접근 규칙을 실제 역할로 확인한다.
// 체인 테스트는 정책의 이름만 비교하므로, 새 마이그레이션이 정책 내용을 넓히는 일은 이 테스트가 잡는다.
import assert from 'node:assert/strict';
import { actAs } from './lib/act-as.mjs';
import { applyMigrationChain } from './lib/apply-migration-chain.mjs';

const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
const db = new PGlite();

const OWNER = '00000000-0000-4000-8000-000000000001';
const FRIEND = '00000000-0000-4000-8000-000000000002';
const PENDING = '00000000-0000-4000-8000-000000000003';
const STRANGER = '00000000-0000-4000-8000-000000000004';
const BOOK = '00000000-0000-4000-8000-000000000011';
const SHELF = '00000000-0000-4000-8000-000000000012';
const PUBLIC_ENTRY = '00000000-0000-4000-8000-000000000021';
const PRIVATE_ENTRY = '00000000-0000-4000-8000-000000000022';
const OWNER_NOTIFICATION = '00000000-0000-4000-8000-000000000031';
const FRIEND_NOTIFICATION = '00000000-0000-4000-8000-000000000032';
const DENIED = { code: '42501' };

const as = (userId, run) => actAs(db, userId, run);

// RLS에서 returning과 where는 SELECT 정책도 함께 적용한다. 거부를 확인하는 쿼리에 이것들을 붙이면
// INSERT·UPDATE·DELETE 정책이 풀려도 SELECT 정책이 대신 막아 테스트가 통과하므로, 거부 확인에는 쓰지 않는다.
const INSERT = {
  comments: `insert into public.comments (entry_id, user_id, content) values ($1, $2, 'hello')`,
  likes: `insert into public.likes (entry_id, user_id) values ($1, $2)`,
};

const insertAs = (actor, table, entryId, userId = actor) =>
  as(actor, () => db.query(INSERT[table], [entryId, userId]));

const insertReturningAs = (actor, table, entryId) =>
  as(
    actor,
    async () => (await db.query(`${INSERT[table]} returning id`, [entryId, actor])).rows[0].id
  );

const entriesOf = (actor, table) =>
  as(actor, async () => {
    const { rows } = await db.query(`select entry_id from public.${table} order by entry_id`);
    return rows.map((row) => row.entry_id);
  });

const deleteAs = (actor, table, id) =>
  as(
    actor,
    async () => (await db.query(`delete from public.${table} where id = $1`, [id])).affectedRows
  );

const updateCreatedAtAs = (actor, table, id) =>
  as(
    actor,
    async () =>
      (await db.query(`update public.${table} set created_at = now() where id = $1`, [id]))
        .affectedRows
  );

const notificationIdsOf = (actor) =>
  as(actor, async () => {
    const { rows } = await db.query('select id from public.notifications order by id');
    return rows.map((row) => row.id);
  });

async function checkEntryReaction(table) {
  await db.query(INSERT[table], [PUBLIC_ENTRY, OWNER]);
  await db.query(INSERT[table], [PRIVATE_ENTRY, OWNER]);

  assert.deepEqual(
    await entriesOf(OWNER, table),
    [PUBLIC_ENTRY, PRIVATE_ENTRY],
    `${table}: 기록 주인은 모두 읽는다`
  );
  assert.deepEqual(
    await entriesOf(FRIEND, table),
    [PUBLIC_ENTRY],
    `${table}: 수락한 친구는 공개 기록의 것만 읽는다`
  );
  assert.deepEqual(await entriesOf(PENDING, table), [], `${table}: 수락 전 친구는 읽지 못한다`);
  assert.deepEqual(await entriesOf(STRANGER, table), [], `${table}: 친구가 아니면 읽지 못한다`);
  await assert.rejects(entriesOf(null, table), DENIED, `${table}: 로그인하지 않으면 읽지 못한다`);

  await assert.rejects(
    insertAs(FRIEND, table, PRIVATE_ENTRY),
    DENIED,
    `${table}: 친구도 비공개 기록에는 남기지 못한다`
  );
  await assert.rejects(
    insertAs(PENDING, table, PUBLIC_ENTRY),
    DENIED,
    `${table}: 수락 전 친구는 남기지 못한다`
  );
  await assert.rejects(
    insertAs(STRANGER, table, PUBLIC_ENTRY),
    DENIED,
    `${table}: 친구가 아니면 남기지 못한다`
  );
  await assert.rejects(
    insertAs(FRIEND, table, PUBLIC_ENTRY, OWNER),
    DENIED,
    `${table}: 다른 사람 이름으로 남기지 못한다`
  );

  const friendRow = await insertReturningAs(FRIEND, table, PUBLIC_ENTRY);

  assert.equal(await deleteAs(OWNER, table, friendRow), 0, `${table}: 남의 것은 지우지 못한다`);
  assert.equal(await deleteAs(STRANGER, table, friendRow), 0, `${table}: 남의 것은 지우지 못한다`);
  assert.equal(await updateCreatedAtAs(FRIEND, table, friendRow), 0, `${table}: 고칠 수 없다`);

  await db.query('update public.entries set is_private = true where id = $1', [PUBLIC_ENTRY]);
  assert.deepEqual(
    await entriesOf(FRIEND, table),
    [],
    `${table}: 기록을 비공개로 돌리면 친구는 자기가 남긴 것도 읽지 못한다`
  );
  await db.query('update public.entries set is_private = false where id = $1', [PUBLIC_ENTRY]);

  assert.equal(await deleteAs(FRIEND, table, friendRow), 1, `${table}: 내가 남긴 것은 지운다`);
}

async function checkNotifications() {
  await db.query(
    `insert into public.notifications (id, user_id, actor_id, type) values
       ($1, $3, $4, 'friend_request'),
       ($2, $4, $3, 'friend_request')`,
    [OWNER_NOTIFICATION, FRIEND_NOTIFICATION, OWNER, FRIEND]
  );

  assert.deepEqual(await notificationIdsOf(OWNER), [OWNER_NOTIFICATION], '내 알림만 읽는다');
  assert.deepEqual(await notificationIdsOf(FRIEND), [FRIEND_NOTIFICATION], '내 알림만 읽는다');
  assert.deepEqual(
    await notificationIdsOf(STRANGER),
    [],
    '받은 알림이 없으면 아무것도 읽지 못한다'
  );
  await assert.rejects(notificationIdsOf(null), DENIED, '로그인하지 않으면 읽지 못한다');

  const ownerNotification = async () =>
    (await db.query('select read_at from public.notifications where id = $1', [OWNER_NOTIFICATION]))
      .rows[0];

  await as(FRIEND, async () => {
    await db.query('update public.notifications set read_at = now()');
  });
  assert.equal((await ownerNotification()).read_at, null, '남의 알림을 읽음 처리하지 못한다');

  await as(FRIEND, async () => {
    await db.query('delete from public.notifications');
  });
  assert.ok(await ownerNotification(), '남의 알림을 지우지 못한다');

  await as(FRIEND, async () => {
    await assert.rejects(
      db.query(
        `insert into public.notifications (user_id, actor_id, type) values ($1, $2, 'comment')`,
        [OWNER, FRIEND]
      ),
      DENIED,
      '앱 사용자는 알림을 직접 만들지 못한다'
    );
  });

  await as(OWNER, async () => {
    await assert.rejects(
      db.query(`update public.notifications set type = 'comment' where id = $1`, [
        OWNER_NOTIFICATION,
      ]),
      DENIED,
      '내 알림도 읽음 표시 말고는 고치지 못한다'
    );
    await assert.rejects(
      db.query('update public.notifications set user_id = $1', [FRIEND]),
      DENIED,
      '내 알림을 남에게 넘기지 못한다'
    );
    const read = await db.query('update public.notifications set read_at = now() where id = $1', [
      OWNER_NOTIFICATION,
    ]);
    assert.equal(read.affectedRows, 1, '내 알림은 읽음 처리한다');
    const deleted = await db.query('delete from public.notifications where id = $1', [
      OWNER_NOTIFICATION,
    ]);
    assert.equal(deleted.affectedRows, 1, '내 알림은 지운다');
  });
}

try {
  await applyMigrationChain(db);

  await db.exec(`
    insert into auth.users (id) values ('${OWNER}'), ('${FRIEND}'), ('${PENDING}'), ('${STRANGER}');
    insert into public.profiles (id, name, nickname, tag) values
      ('${OWNER}', 'owner', 'contractowner', '0001'),
      ('${FRIEND}', 'friend', 'contractfriend', '0002'),
      ('${PENDING}', 'pending', 'contractpending', '0003'),
      ('${STRANGER}', 'stranger', 'contractstranger', '0004');
    insert into public.books (id, title) values ('${BOOK}', 'fixture');
    insert into public.user_books (id, user_id, book_id) values ('${SHELF}', '${OWNER}', '${BOOK}');
    insert into public.entries (id, user_book_id, date, quote, is_private) values
      ('${PUBLIC_ENTRY}', '${SHELF}', '2026-11-05', 'public', false),
      ('${PRIVATE_ENTRY}', '${SHELF}', '2026-11-05', 'private', true);
    insert into public.friends (user_id, friend_id, status) values
      ('${OWNER}', '${FRIEND}', 'accepted'),
      ('${OWNER}', '${PENDING}', 'pending');
  `);

  await checkEntryReaction('comments');
  await checkEntryReaction('likes');
  await checkNotifications();

  console.warn(
    'PASS: comments, likes and notifications keep their access rules after the full chain'
  );
} catch (error) {
  console.error(error.message, error.code ?? '');
  process.exitCode = 1;
} finally {
  await db.close();
}
