// 메모리 안의 임시 PGlite DB에서 계약 테스트를 모두 실행한다. Supabase 접속 정보나 원격 연결을 쓰지 않는다.
// run-*-contract.mjs를 자동으로 찾으므로, 새 계약 테스트는 이름만 맞추면 CI에 포함된다.
// 하나가 실패해도 끝까지 돌려 실패한 테스트를 한 번에 보여 준다.
// run-registration-contract.py는 실제 Postgres가 필요해 CI에서 별도 단계로 실행한다.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));
const tests = readdirSync(dir)
  .filter((name) => /^run-.+-contract\.mjs$/.test(name))
  .sort();

if (tests.length === 0) {
  console.error('계약 테스트를 찾지 못했습니다.');
  process.exit(1);
}

const failed = [];
for (const name of tests) {
  console.warn(`\n--- ${name}`);
  const { status } = spawnSync(process.execPath, [`${dir}${name}`], { stdio: 'inherit' });
  if (status !== 0) failed.push(name);
}

console.warn(`\n${tests.length - failed.length}/${tests.length} 통과`);
if (failed.length > 0) {
  console.error(`실패: ${failed.join(', ')}`);
  process.exit(1);
}
