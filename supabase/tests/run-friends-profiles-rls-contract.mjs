// 마이그레이션 전체를 적용한 뒤 친구 관계·프로필·책 정보의 접근 규칙을 실제 역할로 확인한다.
// 친구 관계는 비공개 범위의 기준이라, 스스로 수락을 위조할 수 있으면 다른 테이블의 규칙도 함께 무너진다.
import assert from 'node:assert/strict';
import {
  DENIED,
  FRIEND,
  OWNER,
  PENDING,
  PUBLIC_ENTRY,
  SHELF,
  STRANGER,
  runRlsContract,
  uuid,
} from './lib/rls-fixture.mjs';

const NEWCOMER = uuid(5);
const SPARE_BOOK = uuid(13);

await runRlsContract(
  'friends, profiles and books keep their access rules after the full chain',
  async ({ db, run }) => {
    const friendRowsOf = async (actor) =>
      (await run(actor, 'select id from public.friends')).rows.length;
    const statusOf = async (userId, friendId) =>
      (
        await db.query('select status from public.friends where user_id = $1 and friend_id = $2', [
          userId,
          friendId,
        ])
      ).rows[0]?.status;
    const entriesSeenBy = async (actor) =>
      (await run(actor, 'select id from public.entries')).rows.map((row) => row.id);

    // 친구 관계: 읽기
    assert.equal(await friendRowsOf(OWNER), 2, '내가 포함된 관계를 읽는다');
    assert.equal(await friendRowsOf(FRIEND), 1, '내가 포함된 관계만 읽는다');
    assert.equal(await friendRowsOf(STRANGER), 0, '남의 관계는 읽지 못한다');
    await assert.rejects(friendRowsOf(null), DENIED, '로그인하지 않으면 읽지 못한다');

    // 친구 관계: 요청
    const request = (actor, userId, friendId, status = 'pending') =>
      run(actor, 'insert into public.friends (user_id, friend_id, status) values ($1, $2, $3)', [
        userId,
        friendId,
        status,
      ]);
    await assert.rejects(request(STRANGER, OWNER, FRIEND), DENIED, '남의 이름으로 요청하지 못한다');
    await assert.rejects(request(STRANGER, STRANGER, STRANGER), DENIED, '나에게 요청하지 못한다');
    await assert.rejects(
      request(STRANGER, STRANGER, FRIEND, 'accepted'),
      DENIED,
      '수락된 상태로 바로 만들지 못한다'
    );
    await request(STRANGER, STRANGER, OWNER);
    assert.equal(await statusOf(STRANGER, OWNER), 'pending', '내 이름으로 요청한다');

    // 친구 관계: 수락
    await run(OWNER, `update public.friends set status = 'accepted' where user_id = $1`, [OWNER]);
    assert.equal(await statusOf(OWNER, PENDING), 'pending', '요청한 쪽은 스스로 수락하지 못한다');
    await run(STRANGER, `update public.friends set status = 'accepted'`);
    assert.equal(await statusOf(OWNER, PENDING), 'pending', '남의 요청을 수락하지 못한다');
    assert.equal(await statusOf(STRANGER, OWNER), 'pending', '요청한 쪽은 스스로 수락하지 못한다');
    await assert.rejects(
      run(PENDING, 'update public.friends set user_id = $1', [STRANGER]),
      DENIED,
      '요청한 사람을 바꾸지 못한다'
    );
    await assert.rejects(
      run(PENDING, 'update public.friends set friend_id = $1', [STRANGER]),
      DENIED,
      '요청 받는 사람을 바꾸지 못한다'
    );

    assert.deepEqual(await entriesSeenBy(PENDING), [], '수락 전에는 기록을 읽지 못한다');
    await run(PENDING, `update public.friends set status = 'accepted'`);
    assert.equal(await statusOf(OWNER, PENDING), 'accepted', '요청 받은 사람은 수락한다');
    assert.deepEqual(await entriesSeenBy(PENDING), [PUBLIC_ENTRY], '수락하면 공개 기록을 읽는다');

    await run(FRIEND, `update public.friends set status = 'pending'`);
    assert.equal(await statusOf(OWNER, FRIEND), 'accepted', '수락한 관계를 대기로 되돌리지 못한다');

    // 친구 관계: 끊기
    await run(FRIEND, 'delete from public.friends');
    assert.equal(await statusOf(OWNER, FRIEND), undefined, '받은 쪽도 관계를 끊는다');
    assert.equal(await statusOf(OWNER, PENDING), 'accepted', '남의 관계는 끊지 못한다');
    assert.equal(await statusOf(STRANGER, OWNER), 'pending', '남의 요청은 지우지 못한다');
    assert.deepEqual(await entriesSeenBy(FRIEND), [], '관계를 끊으면 기록을 읽지 못한다');
    const cancelled = await run(STRANGER, 'delete from public.friends');
    assert.equal(cancelled.affectedRows, 1, '보낸 요청을 취소한다');

    // 프로필
    await db.query('insert into auth.users (id) values ($1)', [NEWCOMER]);
    const profile = (id) =>
      `insert into public.profiles (id, name, nickname, tag, featured_entry_id, bookmark_user_book_id) values ('${id}', 'new', 'contractnew', '0005', `;
    assert.equal(
      (await run(STRANGER, 'select id from public.profiles')).rows.length,
      4,
      '로그인한 사용자는 프로필을 찾아 읽는다'
    );
    await assert.rejects(
      run(null, 'select id from public.profiles'),
      DENIED,
      '로그인하지 않으면 프로필을 읽지 못한다'
    );

    await assert.rejects(
      run(STRANGER, `${profile(NEWCOMER)} null, null)`),
      DENIED,
      '남의 프로필을 만들지 못한다'
    );
    await assert.rejects(
      run(NEWCOMER, `${profile(NEWCOMER)} '${PUBLIC_ENTRY}', null)`),
      DENIED,
      '만들 때 대표 문장을 넣지 못한다'
    );
    await assert.rejects(
      run(NEWCOMER, `${profile(NEWCOMER)} null, '${SHELF}')`),
      DENIED,
      '만들 때 책갈피를 넣지 못한다'
    );
    await run(NEWCOMER, `${profile(NEWCOMER)} null, null)`);

    const bioOf = async (id) =>
      (await db.query('select bio from public.profiles where id = $1', [id])).rows[0]?.bio;
    await run(STRANGER, `update public.profiles set bio = 'changed'`);
    assert.notEqual(await bioOf(OWNER), 'changed', '남의 프로필을 고치지 못한다');
    assert.equal(await bioOf(STRANGER), 'changed', '내 프로필은 고친다');
    await assert.rejects(
      run(STRANGER, 'update public.profiles set id = $1', [OWNER]),
      { code: /^(42501|23505)$/ },
      '내 프로필의 주인을 바꾸지 못한다'
    );
    await assert.rejects(
      run(STRANGER, 'update public.profiles set featured_entry_id = $1', [PUBLIC_ENTRY]),
      DENIED,
      '남의 기록을 대표 문장으로 고르지 못한다'
    );
    await assert.rejects(
      run(STRANGER, 'update public.profiles set bookmark_user_book_id = $1', [SHELF]),
      DENIED,
      '남의 책을 책갈피로 고르지 못한다'
    );
    await run(
      OWNER,
      'update public.profiles set featured_entry_id = $1, bookmark_user_book_id = $2',
      [PUBLIC_ENTRY, SHELF]
    );
    assert.equal(
      (await db.query('select featured_entry_id from public.profiles where id = $1', [OWNER]))
        .rows[0].featured_entry_id,
      PUBLIC_ENTRY,
      '내 기록은 대표 문장으로 고른다'
    );

    const removedProfiles = await run(STRANGER, 'delete from public.profiles');
    assert.equal(removedProfiles.affectedRows, 0, '프로필은 앱 사용자가 지우지 못한다');

    // 책 정보: 함께 쓰는 정보라 누구나 읽고 추가하지만, 고치거나 지우지는 못한다.
    await db.query(`insert into public.books (id, title) values ($1, 'spare')`, [SPARE_BOOK]);
    assert.equal(
      (await run(STRANGER, 'select id from public.books')).rows.length,
      2,
      '로그인한 사용자는 책 정보를 읽는다'
    );
    await assert.rejects(
      run(null, 'select id from public.books'),
      DENIED,
      '로그인하지 않으면 책 정보를 읽지 못한다'
    );
    await run(STRANGER, `insert into public.books (title) values ('added')`);
    await assert.rejects(
      run(null, `insert into public.books (title) values ('anon')`),
      DENIED,
      '로그인하지 않으면 책 정보를 추가하지 못한다'
    );

    const titles = async () =>
      (await db.query('select title from public.books order by title')).rows.map(
        (row) => row.title
      );
    await run(STRANGER, `update public.books set title = 'changed'`);
    assert.deepEqual(await titles(), ['added', 'fixture', 'spare'], '책 정보를 고치지 못한다');
    await run(STRANGER, 'delete from public.books');
    assert.deepEqual(await titles(), ['added', 'fixture', 'spare'], '책 정보를 지우지 못한다');
  }
);
