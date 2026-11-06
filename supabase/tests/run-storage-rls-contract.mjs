// 마이그레이션 전체를 적용한 뒤 프로필 이미지 저장소의 접근 규칙을 실제 역할로 확인한다.
// storage.objects는 임시 DB의 스텁이다. 실제 Storage API의 동작이 아니라 DB 정책만 확인한다.
import assert from 'node:assert/strict';
import { FRIEND, OWNER, STRANGER, DENIED, runRlsContract } from './lib/rls-fixture.mjs';

const USED = `${OWNER}/used.png`;
const UNUSED = `${OWNER}/unused.png`;
const FRIEND_FILE = `${FRIEND}/friend.png`;

await runRlsContract(
  'profile image storage keeps its access rules after the full chain',
  async ({ db, run }) => {
    await db.exec(`
    grant select, insert, update, delete on storage.objects to anon, authenticated;
    insert into storage.buckets (id, public) values ('other', false);
    insert into storage.objects (bucket_id, name, owner) values
      ('profiles', '${USED}', '${OWNER}'),
      ('profiles', '${UNUSED}', '${OWNER}'),
      ('profiles', '${FRIEND_FILE}', '${FRIEND}'),
      ('other', '${OWNER}/other.png', '${OWNER}');
    update public.profiles set profile_image = '${USED}' where id = '${OWNER}';
  `);

    const namesSeenBy = async (actor) =>
      (await run(actor, 'select name from storage.objects order by name')).rows
        .map((row) => row.name)
        .sort();
    const adminNames = async () =>
      (await db.query('select name from storage.objects')).rows.map((row) => row.name).sort();
    const upload = (actor, bucket, name) =>
      run(actor, 'insert into storage.objects (bucket_id, name) values ($1, $2)', [bucket, name]);
    const before = await adminNames();

    // 읽기
    assert.deepEqual(await namesSeenBy(OWNER), [USED, UNUSED].sort(), '내 파일은 모두 읽는다');
    assert.deepEqual(
      await namesSeenBy(STRANGER),
      [USED],
      '남의 파일은 프로필에 쓰인 이미지만 읽는다'
    );
    assert.deepEqual(await namesSeenBy(null), [], '로그인하지 않으면 읽지 못한다');

    // 올리기
    await assert.rejects(
      upload(STRANGER, 'profiles', `${OWNER}/x.png`),
      DENIED,
      '남의 폴더에 올리지 못한다'
    );
    await assert.rejects(
      upload(OWNER, 'other', `${OWNER}/x.png`),
      DENIED,
      '다른 버킷에는 올리지 못한다'
    );
    await assert.rejects(
      upload(null, 'profiles', `${OWNER}/x.png`),
      DENIED,
      '로그인하지 않으면 올리지 못한다'
    );

    // 고치기·지우기
    await run(STRANGER, `update storage.objects set metadata = '{"changed":true}'`);
    const changed = await db.query(
      `select count(*)::int as n from storage.objects where metadata is not null`
    );
    assert.equal(changed.rows[0].n, 0, '남의 파일을 고치지 못한다');
    await assert.rejects(
      run(OWNER, 'update storage.objects set name = $1', [`${FRIEND}/moved.png`]),
      DENIED,
      '내 파일을 남의 폴더로 옮기지 못한다'
    );
    await run(STRANGER, 'delete from storage.objects');
    await run(null, 'delete from storage.objects');
    assert.deepEqual(await adminNames(), before, '남의 파일을 지우지 못한다');

    // 본인
    await upload(OWNER, 'profiles', `${OWNER}/new.png`);
    const moved = await run(OWNER, 'update storage.objects set metadata = $1 where name = $2', [
      '{"v":1}',
      `${OWNER}/new.png`,
    ]);
    assert.equal(moved.affectedRows, 1, '내 파일은 고친다');
    const removed = await run(OWNER, 'delete from storage.objects where name = $1', [
      `${OWNER}/new.png`,
    ]);
    assert.equal(removed.affectedRows, 1, '내 파일은 지운다');
  }
);
