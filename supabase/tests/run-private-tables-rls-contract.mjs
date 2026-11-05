// 마이그레이션 전체를 적용한 뒤 알림 설정·이메일 동의·책 등록 요청처럼 본인만 보는 테이블과,
// 앱 사용자에게 아예 열지 않는 내부 테이블의 접근 규칙을 실제 역할로 확인한다.
import assert from 'node:assert/strict';
import {
  BOOK,
  DENIED,
  FRIEND,
  OWNER,
  SHELF,
  STRANGER,
  runRlsContract,
  uuid,
} from './lib/rls-fixture.mjs';

const OWN_READ_ONLY = [
  'push_preferences',
  'push_deliveries',
  'email_preferences',
  'email_consent_events',
];
const INTERNAL = ['email_deliveries', 'feature_rollouts', 'push_finished_receipts', 'push_seen'];
const FRIEND_SHELF = uuid(14);

await runRlsContract(
  'private and internal tables keep their access rules after the full chain',
  async ({ db, run }) => {
    await db.query('insert into public.user_books (id, user_id, book_id) values ($1, $2, $3)', [
      FRIEND_SHELF,
      FRIEND,
      BOOK,
    ]);
    for (const [index, user] of [OWNER, FRIEND].entries()) {
      await db.query('insert into public.push_preferences (user_id) values ($1)', [user]);
      await db.query(`insert into public.push_deliveries (user_id, items) values ($1, '[]')`, [
        user,
      ]);
      await db.query('insert into public.email_preferences (user_id) values ($1)', [user]);
      await db.query(
        `insert into public.email_consent_events (user_id, request_id, enabled, copy_version, source, expected_version, version)
       values ($1, $2, true, 'v1', 'settings', 0, 1)`,
        [user, uuid(50 + index)]
      );
      await db.query(
        `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, $2, 'key', 'auth')`,
        [user, `https://push.example/${index}`]
      );
      await db.query(
        `insert into public.book_registration_requests (user_id, request_id, payload, book_id, user_book_id) values ($1, $2, '{}', $3, $4)`,
        [user, uuid(60 + index), BOOK, user === OWNER ? SHELF : FRIEND_SHELF]
      );
    }

    const usersSeenBy = async (actor, table) =>
      (await run(actor, `select user_id from public.${table}`)).rows.map((row) => row.user_id);
    const adminCount = async (table, user) =>
      (await db.query(`select count(*)::int as n from public.${table} where user_id = $1`, [user]))
        .rows[0].n;

    // 본인만 읽는 테이블
    for (const table of [...OWN_READ_ONLY, 'push_subscriptions', 'book_registration_requests']) {
      assert.deepEqual(await usersSeenBy(OWNER, table), [OWNER], `${table}: 내 것만 읽는다`);
      assert.deepEqual(
        await usersSeenBy(FRIEND, table),
        [FRIEND],
        `${table}: 친구의 것도 내 것이 아니면 읽지 못한다`
      );
      assert.deepEqual(await usersSeenBy(STRANGER, table), [], `${table}: 남의 것은 읽지 못한다`);
      await assert.rejects(
        usersSeenBy(null, table),
        DENIED,
        `${table}: 로그인하지 않으면 읽지 못한다`
      );
    }

    // 읽기만 가능: 쓰기는 서버 함수로만 한다.
    for (const table of OWN_READ_ONLY) {
      await assert.rejects(
        run(OWNER, `update public.${table} set user_id = user_id`),
        DENIED,
        `${table}: 앱 사용자는 고치지 못한다`
      );
      await assert.rejects(
        run(OWNER, `delete from public.${table}`),
        DENIED,
        `${table}: 앱 사용자는 지우지 못한다`
      );
      await assert.rejects(
        run(OWNER, `insert into public.${table} (user_id) values ($1)`, [OWNER]),
        DENIED,
        `${table}: 앱 사용자는 만들지 못한다`
      );
    }

    // 알림 구독: 본인 것만 지운다.
    await run(FRIEND, 'delete from public.push_subscriptions');
    assert.equal(await adminCount('push_subscriptions', OWNER), 1, '남의 구독을 지우지 못한다');
    assert.equal(await adminCount('push_subscriptions', FRIEND), 0, '내 구독은 지운다');
    await assert.rejects(
      run(
        OWNER,
        `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, 'https://push.example/x', 'k', 'a')`,
        [OWNER]
      ),
      DENIED,
      '구독 등록은 서버 함수로만 한다'
    );

    // 책 등록 요청: 내 책장의 내 책으로만 남긴다.
    const requestAs = (actor, user, shelf, book = BOOK) =>
      run(
        actor,
        `insert into public.book_registration_requests (user_id, request_id, payload, book_id, user_book_id) values ($1, gen_random_uuid(), '{}', $2, $3)`,
        [user, book, shelf]
      );
    await assert.rejects(
      requestAs(FRIEND, OWNER, SHELF),
      DENIED,
      '남의 이름으로 요청을 남기지 못한다'
    );
    await assert.rejects(
      requestAs(OWNER, OWNER, FRIEND_SHELF),
      DENIED,
      '남의 책장으로 요청을 남기지 못한다'
    );
    await requestAs(OWNER, OWNER, SHELF);
    assert.equal(
      await adminCount('book_registration_requests', OWNER),
      2,
      '내 책장으로 요청을 남긴다'
    );
    await assert.rejects(
      run(OWNER, 'delete from public.book_registration_requests'),
      DENIED,
      '요청 기록은 지우지 못한다'
    );

    // 내부 테이블: 앱 사용자에게 열지 않는다.
    for (const table of INTERNAL) {
      await assert.rejects(
        run(OWNER, `select * from public.${table}`),
        DENIED,
        `${table}: 앱 사용자는 읽지 못한다`
      );
      await assert.rejects(
        run(null, `select * from public.${table}`),
        DENIED,
        `${table}: 로그인하지 않으면 읽지 못한다`
      );
    }
  }
);
