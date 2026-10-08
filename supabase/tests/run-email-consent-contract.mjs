import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
const request = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let checks = 0;
async function value(sql, params = []) {
  return (await db.query(sql, params)).rows[0]?.v;
}
async function save(
  user,
  enabled,
  id,
  version,
  source = 'settings',
  profile = null,
  email = user === a ? 'one@example.test' : 'two@example.test'
) {
  return value('select public.save_email_consent($1,$2,$3,$4,$5,$6,$7,$8) v', [
    user,
    enabled,
    request(id),
    version,
    source,
    'email-news-v1',
    email,
    profile,
  ]);
}
async function rejects(fn, pattern) {
  await assert.rejects(fn, pattern);
  checks++;
}
try {
  await db.exec(await readFile(new URL('./privacy-fixture-schema.sql', import.meta.url), 'utf8'));
  await db.exec(
    'create role service_role bypassrls; alter table auth.users add email text, add email_confirmed_at timestamptz; alter table public.profiles add unique(nickname,tag);'
  );
  await db.exec(
    await readFile(
      new URL('../migrations/20261007090000_email_marketing_consent.sql', import.meta.url),
      'utf8'
    )
  );
  await db.query(
    'insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now())',
    [a, 'one@example.test', b, 'two@example.test']
  );
  assert.equal(await value('select count(*)::int v from public.email_preferences'), 0);
  checks++;
  const profile = { name: '독자', nickname: 'reader', tag: '1000', bio: null };
  // An address change before first consent must not opt in the unseen address.
  await db.query('update auth.users set email=$2 where id=$1', [a, 'new@example.test']);
  await rejects(() => save(a, true, 90, 0, 'onboarding', profile), /email_conflict/);
  assert.equal(await value('select count(*)::int v from public.profiles where id=$1', [a]), 0);
  assert.equal(await value('select count(*)::int v from public.email_consent_events'), 0);
  checks++;
  await db.query('update auth.users set email=$2 where id=$1', [a, 'one@example.test']);
  const first = await save(a, true, 1, 0, 'onboarding', profile);
  assert.equal(first.enabled, true);
  assert.equal(first.version, 1);
  checks++;
  assert.equal((await save(a, true, 1, 0, 'onboarding', profile)).version, 1);
  checks++;
  await rejects(() => save(a, false, 1, 0, 'onboarding', profile), /request_conflict/);
  await rejects(() => save(a, false, 2, 0), /version_conflict/);
  // Profile conflict rolls back consent too.
  await rejects(() => save(b, true, 3, 0, 'onboarding', profile), /unique constraint/);
  assert.equal(
    await value('select count(*)::int v from public.email_preferences where user_id=$1', [b]),
    0
  );
  checks++;
  // Unchecked registration is allowed and never eligible.
  await save(b, false, 4, 0, 'onboarding', { ...profile, nickname: 'other' });
  assert.equal(
    await value('select public.claim_marketing_email($1,$2,$3,$4) v', [
      b,
      request(100),
      'body',
      'token-b',
    ]),
    null
  );
  checks++;
  const claim = await value('select public.claim_marketing_email($1,$2,$3,$4) v', [
    a,
    request(101),
    'body',
    'token-a',
  ]);
  assert.equal(claim.email, 'one@example.test');
  checks++;
  assert.equal(
    await value('select public.claim_marketing_email($1,$2,$3,$4) v', [
      a,
      request(101),
      'body',
      'token-a',
    ]),
    null
  );
  checks++;
  assert.equal(await value("select public.withdraw_email_by_token('bad') v"), false);
  checks++;
  assert.equal(await value("select public.withdraw_email_by_token('token-a') v"), true);
  checks++;
  assert.equal((await save(a, true, 1, 0, 'onboarding', profile)).enabled, false);
  checks++;
  assert.equal(await value("select public.withdraw_email_by_token('token-a') v"), true);
  assert.equal(
    await value('select version v from public.email_preferences where user_id=$1', [a]),
    2
  );
  checks++;
  assert.equal(
    await value('select public.claim_marketing_email($1,$2,$3,$4) v', [
      a,
      request(102),
      'body',
      'token-c',
    ]),
    null
  );
  checks++;
  await save(a, true, 5, 2);
  await db.query('update auth.users set email=$2 where id=$1', [a, 'changed@example.test']);
  assert.equal(
    await value('select enabled v from public.email_preferences where user_id=$1', [a]),
    false
  );
  checks++;
  await db.query('update auth.users set email=$2,email_confirmed_at=null where id=$1', [
    a,
    'one@example.test',
  ]);
  await rejects(() => save(a, true, 6, 4), /email_unconfirmed/);
  // Disabled preferences retain their version when the address changes.
  await db.query('update auth.users set email=$2 where id=$1', [b, 'new@example.test']);
  await rejects(() => save(b, true, 91, 1), /email_conflict/);
  assert.equal(
    await value('select version v from public.email_preferences where user_id=$1', [b]),
    1
  );
  checks++;
  const fresh = await save(b, true, 92, 1, 'settings', null, 'new@example.test');
  assert.equal(fresh.email, 'new@example.test');
  checks++;
  await rejects(() => save(b, true, 92, 1), /request_conflict/);
  // Withdrawal still works even if the screen's email is stale.
  await save(b, false, 93, 2);
  await db.query('update auth.users set email=$2 where id=$1', [b, 'two@example.test']);
  // Concurrent stale writes cannot both succeed, even without a browser lock.
  const results = await Promise.allSettled([save(b, true, 7, 3), save(b, false, 8, 3)]);
  assert.equal(results.filter((x) => x.status === 'fulfilled').length, 1);
  checks++;
  await db.exec(`set role authenticated; set request.jwt.claims='{"sub":"${a}"}';`);
  assert.equal(await value('select count(*)::int v from public.email_preferences'), 1);
  checks++;
  await rejects(
    () => db.exec('update public.email_preferences set enabled=true'),
    /permission denied/
  );
  await rejects(() => save(b, true, 9, 2), /permission denied/);
  await rejects(
    () => db.exec("select public.withdraw_email_by_token('token-a')"),
    /permission denied/
  );
  await rejects(() => db.exec('select * from public.email_deliveries'), /permission denied/);
  await db.exec('reset role; set role anon;');
  await rejects(() => db.exec('select * from public.email_preferences'), /permission denied/);
  await rejects(() => save(a, true, 9, 4), /permission denied/);
  await db.exec('reset role;');
  // Delivery retries older than the provider dedup window require manual review.
  await db.query('update auth.users set email_confirmed_at=now() where id=$1', [a]);
  await save(a, true, 10, 4);
  await value('select public.claim_marketing_email($1,$2,$3,$4) v', [
    a,
    request(103),
    'body',
    'token-old',
  ]);
  await db.exec(
    "update public.email_deliveries set status='unknown',first_attempt_at=now()-interval '25 hours',last_attempt_at=now()-interval '3 minutes' where token_hash='token-old'"
  );
  await rejects(
    () =>
      value('select public.claim_marketing_email($1,$2,$3,$4) v', [
        a,
        request(103),
        'body',
        'token-old',
      ]),
    /delivery_needs_review/
  );
  await db.query('delete from auth.users where id=$1', [a]);
  assert.equal(
    await value('select count(*)::int v from public.email_consent_events where user_id=$1', [a]),
    0
  );
  assert.equal(await value("select public.withdraw_email_by_token('token-a') v"), false);
  checks++;
  console.warn(
    `PASS ${checks} email consent SQL scenarios: RLS, atomic onboarding, retries, concurrent changes, withdrawal, address change, delivery and deletion`
  );
} finally {
  await db.close();
}
