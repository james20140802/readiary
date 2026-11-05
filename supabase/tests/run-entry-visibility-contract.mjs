// 마이그레이션 전체를 적용한 뒤 기록과 책장의 접근 규칙을 실제 역할로 확인한다.
// 체인 테스트는 정책의 이름만 비교하므로, 새 마이그레이션이 정책 내용을 넓히는 일은 이 테스트가 잡는다.
import assert from 'node:assert/strict';
import {
  BOOK,
  DENIED,
  FRIEND,
  OWNER,
  PENDING,
  PRIVATE_ENTRY,
  PUBLIC_ENTRY,
  SHELF,
  STRANGER,
  runRlsContract,
  uuid,
} from './lib/rls-fixture.mjs';

const OTHER_BOOK = uuid(13);
const FRIEND_SHELF = uuid(14);
const OWNER_SPARE_SHELF = uuid(15);

await runRlsContract(
  'entries and shelves keep their access rules after the full chain',
  async ({ db, run }) => {
    const entryIds = async (actor) =>
      (await run(actor, 'select id from public.entries order by id')).rows.map((row) => row.id);
    const shelfIds = async (actor) =>
      (await run(actor, 'select id from public.user_books order by id')).rows.map((row) => row.id);
    const adminQuote = async (id) =>
      (await db.query('select quote from public.entries where id = $1', [id])).rows[0]?.quote;
    const adminShelf = async (id) =>
      (await db.query('select user_id, last_read_page from public.user_books where id = $1', [id]))
        .rows[0];

    // 읽기
    assert.deepEqual(
      await entryIds(OWNER),
      [PUBLIC_ENTRY, PRIVATE_ENTRY],
      '본인은 기록을 모두 읽는다'
    );
    assert.deepEqual(await entryIds(FRIEND), [PUBLIC_ENTRY], '수락한 친구는 공개 기록만 읽는다');
    assert.deepEqual(await entryIds(PENDING), [], '수락 전 친구는 읽지 못한다');
    assert.deepEqual(await entryIds(STRANGER), [], '친구가 아니면 읽지 못한다');
    await assert.rejects(entryIds(null), DENIED, '로그인하지 않으면 테이블에 접근하지 못한다');

    assert.deepEqual(await shelfIds(OWNER), [SHELF], '본인은 책장을 읽는다');
    assert.deepEqual(await shelfIds(FRIEND), [SHELF], '수락한 친구는 책장을 읽는다');
    assert.deepEqual(await shelfIds(PENDING), [], '수락 전 친구는 책장을 읽지 못한다');
    assert.deepEqual(await shelfIds(STRANGER), [], '친구가 아니면 책장을 읽지 못한다');
    await assert.rejects(shelfIds(null), DENIED, '로그인하지 않으면 책장에 접근하지 못한다');

    await db.query(`insert into public.books (id, title) values ($1, 'other')`, [OTHER_BOOK]);
    await db.query('insert into public.user_books (id, user_id, book_id) values ($1, $2, $3)', [
      FRIEND_SHELF,
      FRIEND,
      BOOK,
    ]);

    // 기록 쓰기
    await run(FRIEND, `update public.entries set quote = 'changed'`);
    assert.equal(await adminQuote(PUBLIC_ENTRY), 'public', '친구는 기록을 고치지 못한다');
    assert.equal(await adminQuote(PRIVATE_ENTRY), 'private', '친구는 비공개 기록도 고치지 못한다');

    await run(FRIEND, 'delete from public.entries');
    assert.ok(await adminQuote(PUBLIC_ENTRY), '친구는 기록을 지우지 못한다');
    assert.ok(await adminQuote(PRIVATE_ENTRY), '친구는 비공개 기록도 지우지 못한다');

    await assert.rejects(
      run(
        FRIEND,
        `insert into public.entries (user_book_id, date, quote) values ($1, '2026-11-05', 'x')`,
        [SHELF]
      ),
      DENIED,
      '친구는 남의 책에 기록을 넣지 못한다'
    );
    await assert.rejects(
      run(OWNER, 'update public.entries set user_book_id = $1', [FRIEND_SHELF]),
      DENIED,
      '내 기록을 남의 책으로 옮기지 못한다'
    );

    await run(
      OWNER,
      `insert into public.entries (user_book_id, date, quote) values ($1, '2026-11-06', 'new')`,
      [SHELF]
    );
    const edited = await run(OWNER, `update public.entries set note = 'mine' where id = $1`, [
      PUBLIC_ENTRY,
    ]);
    assert.equal(edited.affectedRows, 1, '본인은 기록을 고친다');
    const removed = await run(OWNER, `delete from public.entries where quote = 'new'`);
    assert.equal(removed.affectedRows, 1, '본인은 기록을 지운다');

    // 책장 쓰기
    await assert.rejects(
      run(FRIEND, 'insert into public.user_books (user_id, book_id) values ($1, $2)', [
        OWNER,
        OTHER_BOOK,
      ]),
      DENIED,
      '남의 책장에 책을 넣지 못한다'
    );
    await run(STRANGER, 'update public.user_books set last_read_page = 99');
    assert.equal((await adminShelf(SHELF)).last_read_page, 0, '남의 책장을 고치지 못한다');
    await run(STRANGER, 'delete from public.user_books');
    assert.ok(await adminShelf(SHELF), '남의 책장을 지우지 못한다');
    await assert.rejects(
      run(OWNER, 'update public.user_books set user_id = $1', [STRANGER]),
      DENIED,
      '내 책장을 남에게 넘기지 못한다'
    );

    await run(OWNER, 'insert into public.user_books (id, user_id, book_id) values ($1, $2, $3)', [
      OWNER_SPARE_SHELF,
      OWNER,
      OTHER_BOOK,
    ]);
    await run(OWNER, 'update public.user_books set last_read_page = 7');
    assert.equal((await adminShelf(SHELF)).last_read_page, 7, '본인은 책장을 고친다');
    const shelfRemoved = await run(OWNER, 'delete from public.user_books where id = $1', [
      OWNER_SPARE_SHELF,
    ]);
    assert.equal(shelfRemoved.affectedRows, 1, '본인은 책장에서 책을 뺀다');
  }
);
