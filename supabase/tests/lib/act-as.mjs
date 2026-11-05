// 실제 앱 요청처럼 역할과 JWT 클레임을 정한 뒤 쿼리를 실행한다. userId가 없으면 로그인하지 않은 사용자다.
export async function actAs(db, userId, run) {
  const role = userId ? 'authenticated' : 'anon';
  const claims = JSON.stringify(userId ? { role, sub: userId } : { role });
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [claims]);
  await db.exec(`set role ${role}`);
  try {
    return await run();
  } finally {
    await db.exec('reset role');
  }
}
