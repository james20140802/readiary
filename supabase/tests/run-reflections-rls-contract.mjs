// 마이그레이션 전체를 적용한 뒤 덧붙인 생각의 접근 규칙과 점진 공개 스위치를 실제 역할로 확인한다.
import assert from 'node:assert/strict';
import {
  DENIED,
  FRIEND,
  OWNER,
  PENDING,
  PRIVATE_ENTRY,
  PUBLIC_ENTRY,
  STRANGER,
  runRlsContract,
  uuid,
} from './lib/rls-fixture.mjs';

const SHARED = uuid(41);
const HIDDEN = uuid(42);
const ON_PRIVATE = uuid(43);

await runRlsContract(
  'entry reflections keep their access rules after the full chain',
  async ({ db, run }) => {
    await db.query(
      `update public.feature_rollouts set enabled = true, user_ids = $1 where key = 'entry_reflections'`,
      [[OWNER, FRIEND]]
    );
    await db.query(
      `insert into public.entry_reflections (id, entry_id, user_id, body, is_private) values
       ($1, $4, $6, 'shared', false), ($2, $4, $6, 'hidden', true), ($3, $5, $6, 'on private', true)`,
      [SHARED, HIDDEN, ON_PRIVATE, PUBLIC_ENTRY, PRIVATE_ENTRY, OWNER]
    );

    const idsSeenBy = async (actor) =>
      (await run(actor, 'select id from public.entry_reflections order by id')).rows.map(
        (row) => row.id
      );
    const adminRow = async (id) =>
      (await db.query('select body, is_private from public.entry_reflections where id = $1', [id]))
        .rows[0];
    const insert = (actor, id, entryId, isPrivate) =>
      run(
        actor,
        `insert into public.entry_reflections (id, entry_id, body, is_private) values ($1, $2, 'new', $3)`,
        [id, entryId, isPrivate]
      );

    // 읽기
    assert.deepEqual(await idsSeenBy(OWNER), [SHARED, HIDDEN, ON_PRIVATE], '본인은 모두 읽는다');
    assert.deepEqual(await idsSeenBy(FRIEND), [SHARED], '친구는 공개 기록의 공개 생각만 읽는다');
    assert.deepEqual(await idsSeenBy(PENDING), [], '수락 전 친구는 읽지 못한다');
    assert.deepEqual(await idsSeenBy(STRANGER), [], '친구가 아니면 읽지 못한다');
    await assert.rejects(idsSeenBy(null), DENIED, '로그인하지 않으면 읽지 못한다');

    // 쓰기
    await assert.rejects(
      insert(FRIEND, uuid(44), PUBLIC_ENTRY, true),
      DENIED,
      '남의 기록에 덧붙이지 못한다'
    );
    await assert.rejects(
      insert(OWNER, uuid(45), PRIVATE_ENTRY, false),
      DENIED,
      '비공개 기록에 공개 생각을 덧붙이지 못한다'
    );
    await insert(OWNER, uuid(46), PRIVATE_ENTRY, true);
    await insert(OWNER, uuid(47), PUBLIC_ENTRY, false);
    await assert.rejects(
      run(
        FRIEND,
        `insert into public.entry_reflections (id, entry_id, user_id, body) values ($1, $2, $3, 'x')`,
        [uuid(48), PUBLIC_ENTRY, OWNER]
      ),
      DENIED,
      '다른 사람 이름으로 덧붙이지 못한다'
    );

    // 고치기
    await run(FRIEND, `update public.entry_reflections set body = 'changed'`);
    assert.equal((await adminRow(SHARED)).body, 'shared', '친구는 고치지 못한다');
    await assert.rejects(
      run(OWNER, 'update public.entry_reflections set user_id = $1', [FRIEND]),
      DENIED,
      '작성자를 바꾸지 못한다'
    );
    await assert.rejects(
      run(OWNER, 'update public.entry_reflections set entry_id = $1', [PUBLIC_ENTRY]),
      DENIED,
      '다른 기록으로 옮기지 못한다'
    );
    await run(OWNER, `update public.entry_reflections set body = 'edited' where id = $1`, [SHARED]);
    assert.equal((await adminRow(SHARED)).body, 'edited', '본인은 고친다');
    await run(OWNER, 'update public.entry_reflections set is_private = false where id = $1', [
      ON_PRIVATE,
    ]);
    assert.equal(
      (await adminRow(ON_PRIVATE)).is_private,
      true,
      '비공개 기록의 생각은 공개로 돌리지 못한다'
    );

    // 지우기
    await run(FRIEND, 'delete from public.entry_reflections');
    assert.ok(await adminRow(SHARED), '친구는 지우지 못한다');

    // 기록을 비공개로 돌리면 이미 공개한 생각도 친구에게서 사라진다.
    await db.query('update public.entries set is_private = true where id = $1', [PUBLIC_ENTRY]);
    assert.deepEqual(await idsSeenBy(FRIEND), [], '기록을 비공개로 돌리면 생각도 읽지 못한다');
    await db.query('update public.entries set is_private = false where id = $1', [PUBLIC_ENTRY]);

    // 점진 공개 스위치가 꺼져 있으면 본인도 쓰지 못하고, 이미 남긴 것은 읽는다.
    await db.query(
      `update public.feature_rollouts set enabled = false where key = 'entry_reflections'`
    );
    await assert.rejects(
      insert(OWNER, uuid(49), PUBLIC_ENTRY, true),
      DENIED,
      '꺼져 있으면 덧붙이지 못한다'
    );
    await run(OWNER, `update public.entry_reflections set body = 'off' where id = $1`, [SHARED]);
    assert.equal((await adminRow(SHARED)).body, 'edited', '꺼져 있으면 고치지 못한다');
    await run(OWNER, 'delete from public.entry_reflections where id = $1', [SHARED]);
    assert.ok(await adminRow(SHARED), '꺼져 있으면 지우지 못한다');
    assert.ok((await idsSeenBy(OWNER)).includes(SHARED), '꺼져 있어도 이미 남긴 것은 읽는다');

    await db.query(
      `update public.feature_rollouts set enabled = true where key = 'entry_reflections'`
    );
    const removed = await run(OWNER, 'delete from public.entry_reflections where id = $1', [
      SHARED,
    ]);
    assert.equal(removed.affectedRows, 1, '본인은 지운다');
  }
);
