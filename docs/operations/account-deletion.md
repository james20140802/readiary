# 계정 탈퇴 운영

독자는 설정 화면에서 직접 탈퇴를 신청하고, 14일 안에 다시 로그인하면 되돌릴 수 있다. 14일이 지나면 정기 작업이 프로필 사진 파일과 계정을 지운다. 메일로 받은 요청도 같은 신청 상태를 기록해 **같은 14일 유예·숨김·자동 삭제**를 거친다. 방침이 약속하는 규칙을 하나로 유지하기 위해서다.

설계와 결정 근거는 [계정 탈퇴와 14일 복구 유예 설계](../superpowers/specs/2026-11-12-account-deletion-design.md)를 따른다. 약관 제8조, 방침 제3조 제1·4·5·6항과 제8조 제3항이 이 절차를 약속한다.

## 시행일과 공고

- 개정 약관·방침은 `lib/legal/texts.ts`의 `LEGAL_ANNOUNCED`에 공고하고 30일 뒤 `TERMS_EFFECTIVE`·`PRIVACY_EFFECTIVE`에 시행한다. 보관이 늘어나는 것으로 읽힐 수 있어 불리한 변경 기준(약관 제10조, 방침 제11조)을 적용했다. 이 브랜치의 초안 값은 2026-11-13 공고, 2026-12-13 시행이다.
- 탈퇴 버튼과 API는 `ACCOUNT_DELETION_EFFECTIVE_AT`(시행일 0시 KST) 전에는 닫혀 있다. 시행일이 바뀌면 이 상수와 `LEGAL_REVISION.noticeUntil`(시행일 다음 날 0시)을 함께 고친다.
- 공고일에 프로덕션에 배포돼 화면에 실려야 공고한 것이다. 머지·배포가 늦어지면 공고일과 시행일을 실제 배포일 기준으로 다시 맞춘다. 공고를 소급 기록하지 않는다.
- 공고 기간 동안 지금 시행 중인 판은 `/terms/2026-11-03`, `/privacy/2026-11-03`에 있다. `/terms`, `/privacy`에는 개정판과 개정 안내가, 오늘 화면에는 시행일까지 닫을 수 있는 한 줄 안내(`PolicyNotice`)가 보인다.

## 앱 흐름

1. **신청**: 설정 → 계정 → "탈퇴하기" 시트. 비밀번호 사용자는 현재 비밀번호를, 비밀번호가 없는 Google 사용자는 10분 안에 다시 로그인했는지를 서버(`POST /api/account/deletion`)가 확인한다. 통과하면 `request_account_deletion`이 `account_deletions`에 신청 시각과 삭제 예정 시각(신청 + 14일)을 남기고 푸시 구독을 지운다. 이어서 모든 기기에서 로그아웃(global sign-out)하고 로그인 화면에 되돌릴 수 있는 날짜를 안내한다.
2. **유예(0~14일)**: 프로필·책장·기록·발췌집·반응·친구 목록·공유 링크·알림에서 그 독자가 다른 사람에게 보이지 않는다. 숨김과 쓰기 차단은 RLS·RPC가 보장한다. 이미 발급된 액세스 토큰이 남아 있어도 쓰기는 거부된다. 푸시 구독은 지워졌고, 이메일 소식은 동의 상태를 그대로 둔 채 발송 대상에서 빠진다(`claim_marketing_email`).
3. **복구**: 유예 중인 계정으로 로그인하면 `/account/restore`로 보낸다. "탈퇴 취소하고 돌아가기"(`DELETE /api/account/deletion` → `cancel_account_deletion`)를 누르면 숨김이 바로 풀린다. 기기 알림은 다시 켜야 한다. 삭제 예정 시각이 지난 신청은 취소할 수 없다.
4. **완전 삭제**: 매일 KST 04:17 정기 작업이 기한이 지난 계정을 한 번에 최대 5개씩 처리한다(`app/api/cron/account-deletion/route.ts`).
   1. `profiles` 버킷의 `<uid>/` 아래 파일을 페이지 단위로 끝까지 모은 뒤 Storage API로 지우고, 지운 수가 요청한 수와 같은지 확인한다. Storage 메타데이터 행을 SQL로 직접 지우지 않는다.
   2. 그 사이 복구되지 않았는지 다시 확인한다.
   3. `account_deletion_purges`에 회원 식별번호와 삭제 시각만 남긴다(`record_account_purge`). 이메일·닉네임·기록 내용은 넣지 않는다.
   4. Auth 사용자를 지운다. FK CASCADE로 프로필·책장·기록·관계·반응·알림·푸시 설정·이메일 소식 기록과 `account_deletions` 행이 함께 지워진다. 공용 서지 정보(`books`)는 방침대로 남을 수 있다.
   5. 어느 단계든 실패하면 완료로 처리하지 않는다. 신청 행이 남아 있으므로 다음 실행에서 다시 집계된다.
   6. 삭제 결과와 상관없이 30일이 지난 `account_deletion_purges` 행을 지운다(`prune_account_purges`).

## 메일 요청 처리

앱에 접근할 수 없는 독자를 위해 방침 제10조 연락처로 받은 요청도 처리한다. 요청을 확인한 날부터 10일 안에 처리하고 결과를 알린다(방침 제8조 제3항).

1. 본인임을 확인한다. 가입 이메일 주소에서 보낸 요청인지 보고, 확실하지 않으면 그 주소로 확인 메일을 보내 답을 받는다. 확인 전에는 처리하지 않는다.
2. Supabase SQL Editor에서 그 계정의 UUID를 찾고(`auth.users`), 다음을 차례로 실행한다.

   ```sql
   select public.request_account_deletion('<uuid>');
   delete from auth.sessions where user_id = '<uuid>';
   ```

   첫 줄은 앱 신청과 같은 상태를 남기고 삭제 예정 시각을 돌려준다(이미 신청한 계정이면 기존 시각을 그대로 돌려준다). 둘째 줄은 모든 기기의 세션을 끊는다. 이미 발급된 액세스 토큰은 만료 전까지 남지만 RLS·RPC가 쓰기를 거부한다.
3. 독자에게 돌려받은 삭제 예정일(KST)과 그 전에 로그인하면 되돌릴 수 있다는 점을 알린다. 나머지는 앱 신청과 같이 정기 작업이 처리한다.
4. 요청을 받은 메일과 처리 사실은 운영자 메일함 외의 곳(노션·이슈·PR)에 이메일 주소나 UUID와 함께 옮겨 적지 않는다.

## 정기 작업 설치

먼저 앱과 마이그레이션 세 개(`20261112090000_account_deletions.sql`, `20261112091000_account_deletion_visibility.sql`, `20261112092000_account_deletion_writes.sql`)를 운영에 반영한다. 다른 미적용 마이그레이션을 일괄 적용하지 않는다.

1. 서버 환경변수 `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`이 Production에 있는지 확인한다. 값은 출력하거나 복사하지 않는다. 서비스 롤 키가 없으면 라우트는 `503 {enabled:false}`로 응답한다.
2. pg_cron과 pg_net이 켜져 있는지 확인한다(푸시 작업에서 이미 켰다).
3. Vault에 `readiary_account_deletion_url`을 운영 도메인의 `https://<운영 도메인>/api/cron/account-deletion`으로 저장한다. `readiary_cron_secret`은 푸시 작업(`enable-push-cron.sql`)에서 쓰는 값을 그대로 쓴다. 값은 소스·문서·로그에 남기지 않는다.
4. SQL Editor에서 `supabase/operations/enable-account-deletion-cron.sql`을 실행한다. Vault 값이 없거나 형식이 틀리면 예외를 내고 멈춘다. 다시 실행해도 같은 이름의 작업을 먼저 해제하므로 안전하다.
5. 설치 확인: `select jobname, schedule, active from cron.job where jobname = 'readiary-account-deletion';`에서 `17 19 * * *`(UTC, KST 04:17)과 `active = true`를 본다.

설치는 시행일 전에 해도 된다. 신청이 없으면 처리할 계정이 없고 정리만 돈다.

## 실패 확인

라우트는 사용자·파일 경로·이메일을 응답과 로그에 남기지 않고 `{purged, failed, pruned}` 집계만 돌려준다. 하나라도 실패하면 `500`이다.

- 정기 작업 실행 기록: `select status, return_message, start_time from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'readiary-account-deletion') order by start_time desc limit 7;`
- HTTP 응답: `select status_code, content, created from net._http_response order by created desc limit 20;`에서 `/api/cron/account-deletion` 응답의 상태와 집계를 본다. pg_net 응답은 짧게 보관되므로 실행 직후에 확인한다. 401은 Vault와 서버의 `CRON_SECRET` 불일치, 503은 서버 환경변수 누락이다.
- 밀린 계정: `select count(*) from public.account_deletions where purge_after <= now() - interval '1 day';`가 0보다 크면 이틀 이상 처리되지 않은 계정이 있다. UUID를 노션·PR에 옮기지 않고, Vercel 함수 로그와 Storage 버킷에서 원인을 본다.
- 파일 삭제 실패는 Storage 권한이나 일시 장애가 흔한 원인이다. 메타데이터 행을 SQL로 지워 넘기지 않는다. 원인을 고친 뒤 다음 실행을 기다리거나, 같은 Authorization 헤더로 라우트를 한 번 호출한다.

## 백업 복구 후 재반영

DB를 백업이나 PITR로 되돌리면 그 시점 뒤에 지운 계정이 되살아날 수 있다.

1. 복구 직후, 앱 접근을 열기 전에 복구본에 남은 `account_deletion_purges`가 아니라 **복구 전 운영 DB의 기록**을 기준으로 삼는다. 복구 전에 `select user_id, purged_at from public.account_deletion_purges;` 결과를 운영자만 접근할 수 있는 곳에 잠시 보관하고, 재반영을 마치면 지운다.
2. 그 목록에 있으면서 복구본에 다시 나타난 계정마다, 앱과 같은 순서로 Storage `profiles/<uid>/` 파일을 지운 뒤 Auth 사용자를 지운다. 가장 단순한 방법은 해당 계정에 `account_deletions` 행을 기한이 지난 상태로 넣고(`purge_after = now()`) 정기 작업 라우트를 호출하는 것이다.
3. 복구 시점에 유예 중이던 신청(`account_deletions`)은 복구본에 그대로 있으므로 원래 기한에 처리된다.
4. 삭제 기록 보관 30일은 Supabase 백업·PITR 보관 기간을 덮는 값이다. 운영 계정의 실제 백업 보관 기간이 30일보다 길어지면 `prune_account_purges`의 기간과 방침 제3조 제6항을 그 값에 맞춰 함께 고치고, 방침 개정 절차를 따른다.

## 검증

- `node supabase/tests/run-account-deletion-contract.mjs`: 신청·복구·삭제 RPC 권한, 유예 중 숨김과 쓰기 거부, 복구 뒤 원상태, 삭제 기록 정리. `npm run test:db`가 `run-*-contract.mjs`를 모두 찾아 실행하므로 CI 필수 검사 "Verify DB contracts"에 포함된다.
- Vitest: 신청·복구 API(출처·본인 확인·재인증), 정기 작업 라우트(파일 삭제 확인, 재확인, 기록 순서, 실패 재시도), 시트·복구 화면.
- 운영 DB 적용, Vault·cron 설치, 실제 Storage 삭제와 Auth 삭제, 모바일 실기기 흐름은 위 테스트로 완료를 대신하지 않는다. 각각 실행한 날과 결과를 이 문서에 따로 적는다.
