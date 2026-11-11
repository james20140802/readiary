// 메모리 안의 임시 PGlite DB만 쓴다. 탈퇴 신청 상태 테이블과 신청·복구·삭제 RPC의 권한과 동작을 확인한다.
import {
  runRlsContract,
  OWNER,
  FRIEND,
  STRANGER,
  SHELF,
  PUBLIC_ENTRY,
  DENIED,
  uuid,
} from './lib/rls-fixture.mjs';
import assert from 'node:assert/strict';

await runRlsContract(
  'account deletion state, RPC permissions, grace period and purge log',
  async ({ db, run }) => {
    // 서비스 롤 호출: 관리자 db에서 역할만 바꿔 실행한다.
    const asService = async (sql, params) => {
      await db.exec('set role service_role');
      try {
        return await db.query(sql, params);
      } finally {
        await db.exec('reset role');
      }
    };
    const denied = async (promise, code = DENIED.code) => {
      await assert.rejects(promise, (e) => e.code === code, `expected ${code}`);
    };
    const ms = (v) => new Date(v).getTime();

    // 푸시 구독을 하나 둔다(신청하면 지워져야 한다).
    await db.exec(
      `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ('${OWNER}', 'https://push.example/1', 'k', 'a')`
    );

    // 신청: 14일 유예, 멱등
    const first = (await asService('select public.request_account_deletion($1) as at', [OWNER]))
      .rows[0].at;
    const row = (
      await db.query(
        'select requested_at, purge_after from public.account_deletions where user_id = $1',
        [OWNER]
      )
    ).rows[0];
    assert.equal(
      ms(first),
      ms(row.requested_at) + 14 * 86400000,
      'purge_after = requested_at + 14일'
    );
    const second = (await asService('select public.request_account_deletion($1) as at', [OWNER]))
      .rows[0].at;
    assert.equal(ms(second), ms(first), '두 번 불러도 같은 값');

    // 푸시 구독 삭제
    const subs = await db.query('select 1 from public.push_subscriptions where user_id = $1', [
      OWNER,
    ]);
    assert.equal(subs.rows.length, 0, '신청하면 push_subscriptions가 지워진다');

    // 사용자가 직접 신청할 수 없다
    await denied(run(OWNER, 'select public.request_account_deletion($1)', [OWNER]));

    // 본인 행만 읽는다
    assert.equal((await run(OWNER, 'select * from public.account_deletions')).rows.length, 1);
    assert.equal((await run(FRIEND, 'select * from public.account_deletions')).rows.length, 0);
    await denied(
      run(
        OWNER,
        `insert into public.account_deletions (user_id, purge_after) values ('${FRIEND}', now())`
      )
    );
    await denied(run(OWNER, `update public.account_deletions set purge_after = now()`));
    await denied(run(OWNER, `delete from public.account_deletions`));
    assert.equal(
      (await db.query('select 1 from public.account_deletions where user_id = $1', [OWNER])).rows
        .length,
      1
    );

    // 활성 여부와 복구
    assert.equal(
      (await db.query('select public.is_account_active($1) as a', [OWNER])).rows[0].a,
      false
    );
    assert.equal(
      (await db.query('select public.is_account_active($1) as a', [FRIEND])).rows[0].a,
      true
    );
    await denied(run(OWNER, 'select public.assert_account_active()'));
    await run(FRIEND, 'select public.assert_account_active()');
    assert.equal(
      (await run(FRIEND, 'select public.cancel_account_deletion() as c')).rows[0].c,
      false
    );
    assert.equal(
      (await db.query('select 1 from public.account_deletions where user_id = $1', [OWNER])).rows
        .length,
      1,
      'FRIEND가 OWNER 행을 지우지 못한다'
    );
    assert.equal(
      (await run(OWNER, 'select public.cancel_account_deletion() as c')).rows[0].c,
      true
    );
    assert.equal(
      (await db.query('select public.is_account_active($1) as a', [OWNER])).rows[0].a,
      true
    );
    await run(OWNER, 'select public.assert_account_active()');

    // 취소는 서비스 롤·비로그인에게 열려 있지 않다
    await denied(run(null, 'select public.cancel_account_deletion()'));

    // 기한이 지난 행만 잡는다
    await asService('select public.request_account_deletion($1)', [OWNER]);
    await asService('select public.request_account_deletion($1)', [FRIEND]);
    await db.exec(
      `update public.account_deletions set purge_after = now() - interval '1 minute' where user_id = '${OWNER}'`
    );
    const due = (
      await asService('select * from public.claim_due_account_deletions(10) as u')
    ).rows.map((r) => r.u);
    assert.deepEqual(due, [OWNER], '기한이 지난 행만 반환');
    await denied(run(OWNER, 'select * from public.claim_due_account_deletions(10)'));

    // 기한이 지난 신청은 취소할 수 없다(삭제 작업과 겹치지 않는다)
    assert.equal(
      (await run(OWNER, 'select public.cancel_account_deletion() as c')).rows[0].c,
      false
    );
    assert.equal(
      (await db.query('select 1 from public.account_deletions where user_id = $1', [OWNER])).rows
        .length,
      1,
      '기한 지난 행은 남는다'
    );
    await denied(run(null, 'select public.is_account_active($1)', [OWNER]));

    // 삭제 기록 정리
    await asService('select public.record_account_purge($1)', [OWNER]);
    await db.exec(
      `update public.account_deletion_purges set purged_at = now() - interval '5 days' where user_id = '${OWNER}'`
    );
    await asService('select public.record_account_purge($1)', [OWNER]); // upsert
    const refreshed = await db.query(
      `select purged_at > now() - interval '1 day' as fresh from public.account_deletion_purges where user_id = $1`,
      [OWNER]
    );
    assert.equal(refreshed.rows.length, 1, 'upsert 뒤에도 OWNER 행은 하나');
    assert.equal(refreshed.rows[0].fresh, true, 'upsert가 purged_at을 갱신한다');
    await asService('select public.record_account_purge($1)', [FRIEND]);
    await db.exec(
      `update public.account_deletion_purges set purged_at = now() - interval '31 days' where user_id = '${OWNER}'`
    );
    await db.exec(
      `update public.account_deletion_purges set purged_at = now() - interval '29 days' where user_id = '${FRIEND}'`
    );
    assert.equal((await asService('select public.prune_account_purges() as n')).rows[0].n, 1);
    assert.deepEqual(
      (await db.query('select user_id from public.account_deletion_purges')).rows.map(
        (r) => r.user_id
      ),
      [FRIEND]
    );
    await denied(run(OWNER, 'select public.prune_account_purges()'));
    await denied(run(OWNER, 'select public.record_account_purge($1)', [OWNER]));

    // 삭제 기록 테이블은 사용자·비로그인에게 닫혀 있다
    await denied(run(OWNER, 'select * from public.account_deletion_purges'));
    await denied(run(null, 'select * from public.account_deletion_purges'));
  }
);

// 유예 중인 계정은 다른 사람(친구·모르는 사람·공유 링크)에게 보이지 않고, 취소하면 그대로 돌아온다.
// 새 DB에서 따로 시드한다. 위 시나리오가 남긴 신청 상태와 섞이지 않게 한다.
await runRlsContract(
  'pending accounts are hidden from others and come back after cancel',
  async ({ db, run }) => {
    const FRIEND_SHELF = uuid(13);
    const FRIEND_BOOK = uuid(14);
    const FRIEND_ENTRY = uuid(23);
    const OWNER_JAN_ENTRY = uuid(24);
    const MONTH = '2026-01';

    // FRIEND의 공개 기록에 OWNER가 댓글·좋아요를 남겼고, 그 알림이 FRIEND에게 있다.
    // OWNER의 공개 기록 하나는 외부 링크로 공유 중이다. 두 사람 모두 1월 발췌집을 친구에게 공개했다.
    await db.exec(`
      insert into public.books (id, title) values ('${FRIEND_BOOK}', 'friend book');
      insert into public.user_books (id, user_id, book_id) values ('${FRIEND_SHELF}', '${FRIEND}', '${FRIEND_BOOK}');
      insert into public.entries (id, user_book_id, date, quote, is_private) values
        ('${FRIEND_ENTRY}', '${FRIEND_SHELF}', '${MONTH}-10', 'friend quote', false),
        ('${OWNER_JAN_ENTRY}', '${SHELF}', '${MONTH}-10', 'owner january quote', false);
      update public.entries set shared_at = now() where id = '${PUBLIC_ENTRY}';
      insert into public.comments (entry_id, user_id, content) values ('${FRIEND_ENTRY}', '${OWNER}', 'owner comment');
      insert into public.likes (entry_id, user_id) values ('${FRIEND_ENTRY}', '${OWNER}');
      insert into public.notifications (user_id, actor_id, type, entry_id) values ('${FRIEND}', '${OWNER}', 'like', '${FRIEND_ENTRY}');
    `);
    await run(OWNER, 'select public.save_monthly_excerpt($1, $2, true)', [
      MONTH,
      [OWNER_JAN_ENTRY],
    ]);
    const friendExcerpt = (
      await run(FRIEND, 'select public.save_monthly_excerpt($1, $2, true) as id', [
        MONTH,
        [FRIEND_ENTRY],
      ])
    ).rows[0].id;
    await db.exec(`
      insert into public.monthly_excerpt_likes (user_id, excerpt_id) values ('${OWNER}', '${friendExcerpt}');
      insert into public.monthly_excerpt_comments (excerpt_id, user_id, content) values ('${friendExcerpt}', '${OWNER}', 'owner excerpt comment');
    `);

    const count = async (who, sql, params) =>
      Number((await run(who, `select count(*)::int as n from (${sql}) q`, params)).rows[0].n);

    // FRIEND·STRANGER·비로그인이 보는 OWNER의 흔적을 한 번에 모은다.
    const snapshot = async () => {
      const feed = (await run(FRIEND, 'select public.get_social_feed_items(0, 20) as f')).rows[0].f;
      const reactions = (
        await run(FRIEND, 'select public.get_monthly_excerpt_reactions($1) as r', [friendExcerpt])
      ).rows[0].r;
      return {
        friendProfiles: await count(FRIEND, 'select 1 from public.profiles where id = $1', [OWNER]),
        strangerProfiles: await count(STRANGER, 'select 1 from public.profiles where id = $1', [
          OWNER,
        ]),
        userBooks: await count(FRIEND, 'select 1 from public.user_books where user_id = $1', [
          OWNER,
        ]),
        entries: await count(FRIEND, 'select 1 from public.entries where user_book_id = $1', [
          SHELF,
        ]),
        comments: await count(
          FRIEND,
          'select 1 from public.comments where entry_id = $1 and user_id = $2',
          [FRIEND_ENTRY, OWNER]
        ),
        likes: await count(
          FRIEND,
          'select 1 from public.likes where entry_id = $1 and user_id = $2',
          [FRIEND_ENTRY, OWNER]
        ),
        excerptLikes: await count(
          FRIEND,
          'select 1 from public.monthly_excerpt_likes where excerpt_id = $1 and user_id = $2',
          [friendExcerpt, OWNER]
        ),
        excerptComments: await count(
          FRIEND,
          'select 1 from public.monthly_excerpt_comments where excerpt_id = $1 and user_id = $2',
          [friendExcerpt, OWNER]
        ),
        friends: await count(
          FRIEND,
          'select 1 from public.friends where user_id = $1 or friend_id = $1',
          [OWNER]
        ),
        notifications: await count(
          FRIEND,
          'select 1 from public.notifications where actor_id = $1',
          [OWNER]
        ),
        isFriend: (await run(FRIEND, 'select public.is_friend_with($1) as f', [OWNER])).rows[0].f,
        feedOwnerItems: feed.filter((i) => i.profile?.id === OWNER).length,
        feedExcerpts: await count(
          FRIEND,
          'select 1 from public.friend_feed_monthly_excerpts(20) where user_id = $1',
          [OWNER]
        ),
        friendExcerpt:
          (
            await run(FRIEND, 'select public.get_friend_monthly_excerpt($1, $2) as x', [
              OWNER,
              MONTH,
            ])
          ).rows[0].x !== null,
        friendExcerptYear: (
          await run(FRIEND, 'select public.get_friend_monthly_excerpt_year($1, 2026) as y', [OWNER])
        ).rows[0].y.length,
        friendExcerptYears: await count(
          FRIEND,
          'select 1 from public.get_friend_monthly_excerpt_years($1)',
          [OWNER]
        ),
        reactionLikes: reactions.likeCount,
        reactionComments: reactions.commentCount,
        publicEntry: await count(null, 'select 1 from public.get_public_entry($1)', [PUBLIC_ENTRY]),
        ownerSelfProfile: await count(OWNER, 'select 1 from public.profiles where id = $1', [
          OWNER,
        ]),
      };
    };

    const before = await snapshot();
    // 시드가 실제로 보이는지 먼저 확인한다(숨김 단언이 헛돌지 않게).
    assert.deepEqual(before, {
      friendProfiles: 1,
      strangerProfiles: 1,
      userBooks: 1,
      entries: 2,
      comments: 1,
      likes: 1,
      excerptLikes: 1,
      excerptComments: 1,
      friends: 1,
      notifications: 1,
      isFriend: true,
      feedOwnerItems: 3,
      feedExcerpts: 1,
      friendExcerpt: true,
      friendExcerptYear: 1,
      friendExcerptYears: 1,
      reactionLikes: 1,
      reactionComments: 1,
      publicEntry: 1,
      ownerSelfProfile: 1,
    });

    await db.exec('set role service_role');
    await db.query('select public.request_account_deletion($1)', [OWNER]);
    await db.exec('reset role');

    assert.deepEqual(
      await snapshot(),
      {
        friendProfiles: 0,
        strangerProfiles: 0,
        userBooks: 0,
        entries: 0,
        comments: 0,
        likes: 0,
        excerptLikes: 0,
        excerptComments: 0,
        friends: 0,
        notifications: 0,
        isFriend: false,
        feedOwnerItems: 0,
        feedExcerpts: 0,
        friendExcerpt: false,
        friendExcerptYear: 0,
        friendExcerptYears: 0,
        reactionLikes: 0,
        reactionComments: 0,
        publicEntry: 0,
        // 본인은 자기 프로필을 계속 읽는다(프록시가 복구 화면으로 보낼 때 쓴다).
        ownerSelfProfile: 1,
      },
      '유예 중에는 다른 사람에게 숨는다'
    );

    // 본인 데이터는 본인에게 그대로 보인다.
    assert.equal(
      await count(OWNER, 'select 1 from public.entries where user_book_id = $1', [SHELF]),
      3
    );

    assert.equal(
      (await run(OWNER, 'select public.cancel_account_deletion() as c')).rows[0].c,
      true
    );
    assert.deepEqual(await snapshot(), before, '취소하면 신청 전과 같다');
  }
);
