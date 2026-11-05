// 메모리 안의 임시 Postgres만 사용한다. Supabase 접속 정보나 원격 연결을 쓰지 않는다.
// 마이그레이션 전체를 적용한 뒤 기록 공개 범위를 실제 역할로 조회해 확인한다.
// 체인 테스트는 정책의 이름만 비교하므로, 새 마이그레이션이 정책 내용을 넓히는 일은 이 테스트가 잡는다.
import assert from 'node:assert/strict';
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

async function as(userId, run) {
  const role = userId ? 'authenticated' : 'anon';
  const claims = JSON.stringify(userId ? { role, sub: userId } : { role });
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [claims]);
  await db.exec(`set role ${role}`);
  try {
    return await run();
  } finally {
    await db.exec('reset role');
  }
}

const visibleEntries = async (userId) =>
  as(userId, async () => {
    const { rows } = await db.query('select id from public.entries order by id');
    return rows.map((row) => row.id);
  });

const visibleShelves = async (userId) =>
  as(userId, async () => (await db.query('select id from public.user_books')).rows.length);

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

  assert.deepEqual(
    await visibleEntries(OWNER),
    [PUBLIC_ENTRY, PRIVATE_ENTRY],
    '본인은 기록을 모두 읽는다'
  );
  assert.deepEqual(
    await visibleEntries(FRIEND),
    [PUBLIC_ENTRY],
    '수락한 친구는 공개 기록만 읽는다'
  );
  assert.deepEqual(await visibleEntries(PENDING), [], '수락 전 친구는 읽지 못한다');
  assert.deepEqual(await visibleEntries(STRANGER), [], '친구가 아니면 읽지 못한다');
  await assert.rejects(
    visibleEntries(null),
    { code: '42501' },
    '로그인하지 않으면 테이블에 접근하지 못한다'
  );

  assert.equal(await visibleShelves(FRIEND), 1, '수락한 친구는 책장을 읽는다');
  assert.equal(await visibleShelves(PENDING), 0, '수락 전 친구는 책장을 읽지 못한다');
  assert.equal(await visibleShelves(STRANGER), 0, '친구가 아니면 책장을 읽지 못한다');

  await as(FRIEND, async () => {
    const updated = await db.query(`update public.entries set quote = 'changed' where id = $1`, [
      PUBLIC_ENTRY,
    ]);
    assert.equal(updated.affectedRows, 0, '친구는 기록을 고치지 못한다');
    const deleted = await db.query('delete from public.entries where id = $1', [PUBLIC_ENTRY]);
    assert.equal(deleted.affectedRows, 0, '친구는 기록을 지우지 못한다');
    await assert.rejects(
      db.query(
        `insert into public.entries (user_book_id, date, quote) values ($1, '2026-11-05', 'x')`,
        [SHELF]
      ),
      { code: '42501' },
      '친구는 남의 책에 기록을 넣지 못한다'
    );
  });

  console.warn(
    'PASS: entries and shelves stay visible only to the owner and accepted friends after the full chain'
  );
} catch (error) {
  console.error(error.message, error.code ?? '');
  process.exitCode = 1;
} finally {
  await db.close();
}
