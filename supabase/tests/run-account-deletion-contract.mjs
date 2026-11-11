// 메모리 안의 임시 PGlite DB만 쓴다. 탈퇴 신청 상태 테이블과 신청·복구·삭제 RPC의 권한과 동작을 확인한다.
import { runRlsContract, OWNER, FRIEND, DENIED } from './lib/rls-fixture.mjs';
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
