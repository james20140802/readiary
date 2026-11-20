// Isolated, in-memory Postgres only. No Supabase credentials or remote connections.
// 빈 DB에 Supabase 스텁과 저장소 마이그레이션 전체를 적용한 뒤, 사진 글자 읽기 동의·한도 계약 SQL을 실행한다.
// SQL 안의 raise exception이 실패다.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { applyMigrationChain } from './lib/apply-migration-chain.mjs';

const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');

const file = fileURLToPath(new URL('./photo_text_contract.sql', import.meta.url));
const db = new PGlite();
try {
  await applyMigrationChain(db);
  await db.exec(await readFile(file, 'utf8'));
  console.warn('통과: photo_text_contract.sql');
} catch (error) {
  console.error(
    `실패: photo_text_contract.sql: ${error.message}`,
    error.detail ?? '',
    error.code ?? '',
    error.where ?? ''
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
