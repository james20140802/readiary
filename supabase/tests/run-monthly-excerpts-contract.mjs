// Isolated, in-memory Postgres only. No Supabase credentials or remote connections.
// 빈 DB에 Supabase 스텁과 저장소 마이그레이션 전체를 적용한 뒤, 계약 SQL을 실행한다.
//   node supabase/tests/run-monthly-excerpts-contract.mjs         monthly_excerpts_*_contract.sql 전부
//   node supabase/tests/run-monthly-excerpts-contract.mjs <sql>   파일 하나만
// 파일마다 새 DB를 쓰므로 한 파일의 데이터가 다른 파일에 새지 않는다.
// SQL 안의 raise exception이 실패다. 하나라도 실패하면 끝까지 돌린 뒤 exit 1로 끝난다.
import { readFile, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyMigrationChain } from './lib/apply-migration-chain.mjs';

const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');

const dir = fileURLToPath(new URL('.', import.meta.url));
const [sqlPath] = process.argv.slice(2);
const sqlFiles = sqlPath
  ? [sqlPath]
  : (await readdir(dir))
      .filter((name) => /^monthly_excerpts_.+_contract\.sql$/.test(name))
      .sort()
      .map((name) => join(dir, name));

if (sqlFiles.length === 0) {
  console.error('달의 발췌집 계약 SQL을 찾지 못했습니다.');
  process.exit(1);
}

const failed = [];
for (const file of sqlFiles) {
  const db = new PGlite();
  try {
    await applyMigrationChain(db);
    await db.exec(await readFile(file, 'utf8'));
    console.warn(`통과: ${basename(file)}`);
  } catch (error) {
    failed.push(basename(file));
    console.error(
      `실패: ${basename(file)}: ${error.message}`,
      error.detail ?? '',
      error.code ?? '',
      error.where ?? ''
    );
  } finally {
    await db.close();
  }
}

if (failed.length > 0) process.exit(1);
