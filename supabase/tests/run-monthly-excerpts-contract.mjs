// Isolated, in-memory Postgres only. No Supabase credentials or remote connections.
// 빈 DB에 Supabase 스텁과 저장소 마이그레이션 전체를 적용한 뒤, 인자로 받은 SQL 파일을 실행한다.
//   node supabase/tests/run-monthly-excerpts-contract.mjs <sql>
// SQL 안의 raise exception이 실패다. 통과하면 출력 없이 exit 0으로 끝난다.
import { readFile } from 'node:fs/promises';
import { applyAllMigrations, loadPGlite, SUPABASE_STUBS_SQL } from './stubs.mjs';

const [sqlPath] = process.argv.slice(2);
if (!sqlPath) {
  console.error('usage: node supabase/tests/run-monthly-excerpts-contract.mjs <sql>');
  process.exit(1);
}

const PGlite = await loadPGlite();
const db = new PGlite();
try {
  await db.exec(SUPABASE_STUBS_SQL);
  await applyAllMigrations(db);
  await db.exec(await readFile(sqlPath, 'utf8'));
} catch (error) {
  console.error(error.message, error.detail ?? '', error.code ?? '', error.where ?? '');
  process.exitCode = 1;
} finally {
  await db.close();
}
