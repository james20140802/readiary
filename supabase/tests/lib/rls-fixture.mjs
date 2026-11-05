// 접근 규칙 테스트의 공통 준비물. 메모리 안의 임시 Postgres만 쓰고 Supabase 접속 정보나 원격 연결을 쓰지 않는다.
//
// 거부를 확인하는 쿼리에는 returning과 where를 붙이지 않는다. RLS에서 이것들은 SELECT 정책도 함께 적용하므로,
// INSERT·UPDATE·DELETE 정책이 풀려도 SELECT 정책이 대신 막아 테스트가 통과한다.
// 그래서 대상을 고르지 않고 실행한 뒤, 남의 행이 그대로인지 관리자 권한으로 확인한다.
import { actAs } from './act-as.mjs';
import { applyMigrationChain } from './apply-migration-chain.mjs';

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const OWNER = uuid(1);
export const FRIEND = uuid(2);
export const PENDING = uuid(3);
export const STRANGER = uuid(4);
export const BOOK = uuid(11);
export const SHELF = uuid(12);
export const PUBLIC_ENTRY = uuid(21);
export const PRIVATE_ENTRY = uuid(22);
export const DENIED = { code: '42501' };
export { uuid };

// 기록 주인, 수락한 친구, 수락 전 친구, 모르는 사람과 주인의 공개·비공개 기록을 만든다.
async function seed(db) {
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
}

// check({ db, run }): db는 관리자 권한, run(사용자, sql, params)은 그 사용자의 권한으로 실행한다. 사용자가 null이면 비로그인이다.
export async function runRlsContract(passMessage, check) {
  const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');
  const db = new PGlite();
  const run = (userId, sql, params) => actAs(db, userId, () => db.query(sql, params));
  try {
    await applyMigrationChain(db);
    await seed(db);
    await check({ db, run });
    console.warn(`PASS: ${passMessage}`);
  } catch (error) {
    console.error(error.message, error.code ?? '');
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}
