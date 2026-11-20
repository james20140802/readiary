# PR 91 개인정보·약관 구현 대조 및 배포 절차

2026-09-06 기준. `lib/legal/texts.ts`의 이용약관·수집 동의서·개인정보처리방침과 실제 코드 및 운영 DB의 읽기 전용 메타데이터를 대조했다. 아래 두 마이그레이션을 적용해야 새 접근 범위가 운영에 반영된다.

## 수정과 검증 근거

| 문서의 약속 | 구현과 확인 |
| --- | --- |
| 프로필 사진은 로그인한 회원에게 표시 | `utils/profile.ts` → `/api/profile-image`: 세션 검증 후 현재 프로필이 가리키는 파일만 다운로드. 응답은 `private, no-store`, 이미지 최적화 프록시를 사용하지 않음. 기존 Supabase 공개 URL의 이미지 최적화 허용도 제거. |
| 사진 변경·삭제 반영 | `AvatarDraft`는 선택 파일을 메모리에 보관하고 저장할 때만 업로드. 저장 취소·A→B 교체·선택 후 제거는 서버 파일을 만들지 않음. DB 저장 실패 시 신규 파일 정리, 저장 성공 후 이전 파일 삭제. 삭제 실패를 표시하고 재저장 시 재시도. |
| 다른 회원의 사진을 바꿀 수 없음 | `private_profile_images` 마이그레이션: 비공개 버킷, 본인 폴더만 쓰기·삭제, 현재 사진만 다른 회원에게 읽기 허용. 제한 정책으로 별도 허용 정책이 추가되어도 범위를 넘지 못하게 함. 프로필에 타인 파일이나 외부 추적 URL 저장 금지. |
| 소유자가 공유한 기록만 링크로 공개 | `explicit_entry_sharing`: `shared_at` 기본 NULL, 본인만 `enable_entry_share` 호출 가능. 공개 RPC는 활성화한 비공개 아닌 기록만 반환. 비공개 전환 시 공유 표식 삭제, 친구 공개로 되돌려도 링크가 부활하지 않음. |
| 개인정보를 PWA 오프라인 캐시에 저장하지 않음 | API·HTML·RSC·Next data·Supabase 요청은 `NetworkOnly`. `start-url` 비활성화. 이전 `static-image-assets`·`static-data-assets`까지 v4 sweep으로 정리. 공유 조회와 OG 응답도 캐시하지 않음. |
| 외부 전송 목적·항목 설명 | Pretendard v1.3.9를 서비스에서 직접 제공해 글꼴 CDN 요청 제거. Vercel 서버 렌더링에 필요한 데이터, Google 사진 주소·동의 시각, Kakao 상세 정보 요청을 문서에 반영. 친구 검색어 콘솔 출력 제거. |
| 프로필·책장·기록·좋아요·댓글·알림의 서로 다른 읽기 범위 | 20260904 RLS와 공개 RPC를 대조. 공용 책 서지 정보는 회원에게 공개, 개인 책장은 본인·친구, 비공개 기록은 본인, 알림은 수신자만. 공유 링크에 좋아요·댓글은 미포함. |
| 가입 시 만 14세 확인·약관 고지 | 2026-10-27 개정(11-03 시행): 가입 화면의 체크박스 세 개를 없애고, 이용 약관·개인정보처리방침은 `LegalNotice`로 고지(필수 처리는 개인정보 보호법 제15조 제1항 제4호 계약 이행 근거). 만 14세 확인은 이메일·Google 가입 모두 온보딩의 `AgeConfirmField` 한 곳에서 받고, `/api/onboarding`이 `lib/auth/consent.ts` 표식을 남긴다. Google 로그인 단계에서 인증 계정이 먼저 만들어지는 점은 약관에 명시. 생년월일이나 연령 증빙을 수집하는 방식은 아님. |
| 탈퇴·보관·파기 | 운영 DB의 FK CASCADE를 읽기 전용으로 확인. Storage 파일은 Auth 삭제만으로 없어지지 않으므로 아래 운영 절차 필요. 공유 서지 정보와 사업자 백업·로그의 별도 수명을 문서에 구분. |

검증: Vitest 294개 통과, TypeScript 통과, ESLint 오류 0개(기존 댓글 컴포넌트 경고 2개), 프로덕션 빌드 성공. 실제 생성된 CSS의 외부 CDN 참조 없음, SW의 start-url 캐시 없음. 로컬 프로덕션 서버 `/privacy`·`/terms` 200, 세션 없는 사진 요청 401 및 no-store 확인.

`supabase/tests/run-privacy-contract.mjs`는 운영 연결 없이 메모리 내 PostgreSQL(PGlite)에서 기존 RLS와 새 마이그레이션을 실행한다. 익명 차단, 회원의 현재 사진 읽기, 미사용 파일 비노출, 타인 폴더 업로드·교체·삭제 거절, 본인 파일 삭제, 타인 사진 연결 거절, 미공유 기록 비노출, 본인만 공유 활성화, 비공개 전환·재공개 후 링크 비활성화를 확인했다. 이는 SQL 정책 검증이며 Supabase Storage HTTP/CDN의 통합 검증은 배포 후 별도로 확인한다.

재현 예시(프로젝트 의존성을 변경하지 않음):

```sh
npm install --prefix /tmp/readiary-pr91-sql --no-save --package-lock=false @electric-sql/pglite@0.5.8
PGLITE_MODULE=/tmp/readiary-pr91-sql/node_modules/@electric-sql/pglite/dist/index.js node supabase/tests/run-privacy-contract.mjs
```

## 배포 순서

1. PR 코드 배포. `/api/profile-image`가 배포되기 전에 버킷을 비공개로 바꾸면 기존 클라이언트의 사진 표시가 중단된다.
2. 같은 릴리스에서 아래 두 마이그레이션을 순서대로 적용한다. 다른 미적용 마이그레이션을 일괄 적용하지 않는다.
   - `20260906063232_private_profile_images.sql`
   - `20260906063529_explicit_entry_sharing.sql`
3. 로그인한 두 회원으로 현재 사진 조회, 본인 사진 교체·제거, 타인 파일 수정·삭제 거부를 실제 Storage API에서 확인한다. 기존 공개 URL은 비로그인 상태에서 거절되어야 한다. 전환 전 외부 CDN·브라우저 또는 수신자가 보관한 사본을 즉시 회수한다고 안내하지 않는다.
4. 기존 공유 링크는 소유자가 다시 공유해야 열린다. 이전 공유 버튼 클릭 기록이 없으므로 모든 기존 기록을 자동 공개 상태로 이관하지 않는다. 비공개 전환 후 HTML·OG 응답이 닫히는지 확인한다.
5. `NEXT_PUBLIC_SUPPORT_EMAIL`을 실제 수신·처리가 가능한 주소로 설정하고 공개 방침, 푸터, Google 브랜딩의 연락처를 확인한다. 코드의 `준비 중`은 연락 수단이 아니며 운영 공개 전 해소해야 한다.
6. 사업자별 실제 로그·백업 보관 설정과 Resend 발송 리전을 운영 계정에서 확인해 방침을 유지한다. Supabase 서울 리전과 Resend 도쿄 발송 리전(ap-northeast-1), 열기·클릭 추적 비활성화는 읽기 전용 프로젝트/도메인 메타데이터로 확인했다. 코드만으로 다른 사업자 설정과 10일 이내 처리·변경 고지 이행을 보장할 수 없다.

운영 DB는 이 작업에서 변경하지 않았다. 운영 DB의 트랜잭션 검증은 자동 승인 검토에서 거절되어 실행하지 않았고 로컬 검증으로 대체했다. 실제 배포와 DB 적용은 별도 운영 단계다.

## 탈퇴 및 미사용 이미지 처리

- 탈퇴는 앱 신청이든 메일 요청이든 같은 14일 유예·숨김을 거쳐 정기 작업이 지운다. 신청·메일 요청 처리·정기 작업 설치·실패 확인·백업 복구 후 재반영은 [계정 탈퇴 운영](account-deletion.md)을 따른다. 파일 삭제를 확인하기 전에 Auth 사용자를 지우지 않고, Storage 메타데이터 행을 SQL로 직접 지우지 않는다.
- 기존 미사용 파일 또는 업로드 도중 브라우저가 종료되어 남은 파일은 프로필 참조와 충분한 유예 시간을 대조해 별도로 정리한다. 이 PR은 기존 파일을 대량 삭제하지 않는다. 새 정책은 미참조 파일을 다른 회원에게 공개하지 않는다.
- 법령상 보관할 별도 항목이 있으면 항목·근거·기간을 기록하고 기간 종료 후 삭제한다. 2026-11-11 판단으로는 법 때문에 남기는 항목이 없다(설계 문서 참고).

참고: [Supabase 비공개 버킷](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Storage 접근 정책](https://supabase.com/docs/guides/storage/security/access-control), [Pretendard v1.3.9](https://github.com/orioncactus/pretendard/tree/v1.3.9). 글꼴 라이선스는 `app/fonts/Pretendard-LICENSE.txt`에 포함한다.

## 운영 보안 점검 기록

읽기 전용 Supabase Advisor는 공개 공유 RPC와 인증된 알림·진도 RPC의 SECURITY DEFINER 권한을 표시했다. 공개 공유 RPC는 위 마이그레이션의 명시적 공유 조건으로 범위를 제한하고, 기존 알림·진도 RPC는 호출자 검사를 유지한다. `rls_auto_enable` 이벤트 트리거의 실행 권한, 유출 비밀번호 차단 설정, Postgres 보안 패치 적용은 별도 운영 점검 항목으로 남긴다. 이 PR에서 운영 인증 설정이나 DB 버전을 변경하지 않았다. [함수 실행 권한 안내](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [유출 비밀번호 보호](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [DB 업그레이드](https://supabase.com/docs/guides/platform/upgrading).

## 이메일 소식 선택 기능 (2026-11-03 수집 시작 예정)

이메일 수신 동의는 필수 약관·Web Push와 분리한다. 적용할 신규 마이그레이션, 본인 읽기/서버 쓰기 권한, 수신거부 토큰 및 로그 제외, 탈퇴 시 CASCADE 삭제와 공급자 기록의 차이는 [이메일 소식 수신 동의 운영](email-marketing-consent.md)을 따른다. 운영 DB 적용과 방침 공고(2026-10-27)는 끝났고 수집은 2026-11-03에 열린다. 실발송은 별도 작업이다. 수집 중지 절차와 담당자는 같은 문서를 따른다.

## 달의 발췌집 친구 공개 (Task 7, 2026-11-06)

친구는 공개 기록으로 이루어진 문장만 읽고, 비공개 기록의 id, 개수, 순서 번호의 빈틈은 응답에 남지 않는다. `monthly_excerpts`와 `monthly_excerpt_items`의 RLS는 소유자 전용 그대로이고, 친구의 길은 `20261106110000_monthly_excerpts_friends.sql`의 정의자 RPC뿐이다. 기록을 복사하지 않고 가리키므로 비공개 전환과 삭제는 다음 읽기에 바로 반영된다.

| 시나리오 | 내 화면 | 친구의 RPC 응답 | 친구 화면 | 근거 |
| --- | --- | --- | --- | --- |
| 순서 [비공개 p, 공개 a, 비공개 q, 공개 b] | 넷 다, 비공개 표시 | a, b만. `position` 1, 2, 표지 a, 수 2. p·q의 id·문장·책 없음, `isPrivate`·`firstSharedAt` 키 없음 | 표제지·책 목록·수 모두 a, b 기준 | 계약 테스트 |
| 나만 보기 | 그대로 | `null`, 해 목록·달 목록에서 빠짐 | 404 | 계약 테스트, 페이지 테스트 |
| 공개 문장을 모두 비공개로 전환 | 그대로, `친구에게 보일 문장이 없어 지금은 나만 볼 수 있어요` | `null`, 다시 공개하면 복귀 | 404, 서재에서 빠짐 | 계약 테스트, 화면 테스트 |
| 일부만 비공개로 전환 | 그대로 | 번호를 다시 매기고 표지가 다음 공개 문장으로 옮겨 감 | 줄어든 내용 | 계약 테스트 |
| 기록 삭제 | 빠짐 | 빠짐 | 빠짐 | 계약 테스트 |
| 친구 해제, 신청만 한 사이, 친구 아님 | 그대로 | `null`·빈 목록·`false` | 404 | 계약 테스트, 페이지 테스트 |
| 없는 달·없는 사람·잘못된 달·범위 밖의 해 | 해당 없음 | 위와 같은 값. 예외를 던지지 않아 존재 여부를 알아낼 수 없음 | 404 | 계약 테스트 |
| anon | 해당 없음 | 실행 권한 없음(42501). `proacl`에 PUBLIC과 anon 항목 없음 | 로그인으로 이동 | 계약 테스트 |
| 테이블 직접 조회(친구) | 해당 없음 | 0행 | 해당 없음 | 계약 테스트 |

내부 함수 `monthly_excerpt_visible_items`는 친구 관계를 확인하지 않으므로 `public`, `anon`, `authenticated` 누구도 실행하지 못한다. 공개 RPC가 정의자 권한으로만 부른다. 계약 스텁(`supabase/tests/lib/apply-migration-chain.mjs`)은 Supabase의 기본 함수 권한(세 역할에 직접 부여)을 재현하므로 `revoke ... from public`만 있고 anon 회수가 빠지면 테스트가 실패한다. 친구 해제 등 재현은 `node supabase/tests/run-monthly-excerpts-contract.mjs supabase/tests/monthly_excerpts_friend_contract.sql`이다.

### 캐시

`next.config.ts` → `lib/pwa/runtime-caching.ts`를 코드로 읽은 결과다. 고칠 것이 없었다.

- `/social/u/*` 화면: 문서 내비게이션과 RSC 요청(`RSC` 헤더, `?_rsc=`)은 첫 규칙 `isPersonalizedSameOriginRequest`에 걸려 `NetworkOnly`다. Cache Storage에 들어가지 않는다.
- `/api/monthly-excerpts*`: `/api/`로 시작하므로 같은 규칙으로 `NetworkOnly`다. 응답 헤더도 `private, no-store, max-age=0`이다(`excerptHeaders`). 친구용 경로 `/api/monthly-excerpts/friend`를 포함한다.
- Supabase 직접 요청: 둘째 규칙으로 `NetworkOnly`다. `start-url` 캐시는 꺼져 있다.
- 위 경로가 첫 규칙에 걸리는지는 `lib/pwa/__tests__/runtime-caching.test.ts`에 추가했다. 세션 없는 `/api/monthly-excerpts/friend` 요청이 401과 `no-store`로 돌아오고, 세션 없는 `/social/u/.../excerpts*`가 로그인으로 이동하는 것은 자리표시자 환경의 개발 서버에서 확인했다.
- 남는 차이: 이미 열어 둔 탭의 메모리에 있는 화면은 지워지지 않는다. Next 라우터 캐시(`staleTimes` 설정 없음)가 뒤로 가기 때 앞서 받은 RSC를 재사용할 수 있고, 브라우저의 bfcache도 같을 수 있다. 다음 새 내비게이션이나 새로 고침부터는 닫힌다. 기기 저장소에 남는 경로는 코드상 없다. 받은 사람이 찍어 둔 화면 같은 사본은 회수할 수 없다.

### 미검증

- 실제 Supabase에서 두 계정으로 비공개 전환·친구 해제 뒤 페이지 접근. 프로덕션 마이그레이션 미적용이고, 이번 검증은 PGlite 계약과 픽스처 화면이다.
- 설치형 PWA와 iOS Safari 실기기의 서비스 워커 동작, 로그인 상태의 페이지 응답 헤더. 위 캐시 항목은 코드 읽기와 단위 테스트이며 실기기 확인이 아니다.
- PGlite의 슈퍼유저 소유자와 달리 프로덕션의 함수 소유자는 `postgres`다. 적용 뒤 `has_function_privilege`로 anon·authenticated 권한을 다시 조회한다.

## 달의 발췌집 좋아요·댓글 (Task 8, 2026-11-06)

반응은 한 권에 붙고, 읽기·남기기·지우기 모두 `can_view_monthly_excerpt` 한 곳에서 정한다(`20261106120000_monthly_excerpt_reactions.sql`). 나만 보기, 공개 문장 없음, 친구 해제는 같은 결과다. 친구에게는 0행과 같은 404이고, 소유자는 그대로 읽으며, 행은 남아 다시 보이면 돌아온다. 숨겨진 동안에는 자기 반응도 지우지 못한다. 권을 지우면 반응과 알림이 함께 사라진다. 계약 테스트: `supabase/tests/monthly_excerpts_reactions_contract.sql`.

- 옛 친구의 이름과 댓글은 소유자와 남은 친구에게 그대로 보인다. 프로필은 로그인한 사용자에게 열려 있고(`profiles_select_authenticated`), 좋아한 사람 명단은 친구가 아니면 링크를 걸지 않는다.
- 숨겨진 동안이나 친구를 끊은 뒤에는 반응으로 알림을 만들지 못한다.
- API 응답은 `no-store`이고 `/api/`는 서비스 워커에서 NetworkOnly다. 프로덕션 적용과 실제 두 계정 확인은 아직 하지 않았다.

## 달의 발췌집 피드와 프로덕션 적용 (Task 9, 2026-11-06)

친구 피드는 `get_social_feed_items`로 읽는다. 기록은 호출자 권한으로 읽어 기존 RLS를 그대로 타고, 발췌집은 정의자 함수 `friend_feed_monthly_excerpts`로 읽는다. 이 함수는 보는 사람을 인자로 받지 않고 `auth.uid()`로만 정한다. 호출자 권한 RPC가 불러야 하므로 `authenticated`에 실행 권한이 있지만, 직접 불러도 그 사람이 피드에서 받는 카드와 같은 내용만 나온다. `monthly_excerpt_visible_items`는 여전히 아무도 직접 부르지 못한다.

- 소식의 시각은 `first_shared_at`이다. 고치거나 공개를 껐다 켜도 자리가 그대로이고 1건이다.
- 나만 보기, 공개 문장 없음, 친구 아님, 신청만 한 사이, 친구 해제는 피드에서 빠진다. 내 발췌집은 내 피드에 없다.
- 표지, 표지의 책 이름, 문장 수, 책 수는 친구에게 보이는 문장 기준이다. 표지가 비공개로 바뀌면 다음 공개 문장이 표지가 된다.
- 계약 테스트: `supabase/tests/monthly_excerpts_feed_contract.sql`. 달의 발췌집 계약 네 개는 `npm run test:db`(`.github/workflows/db-contract.yml`)에서 자격 증명 없이 파일마다 새 메모리 DB로 돈다.
- 캐시: 첫 쪽은 `/social` 문서·RSC 응답이라 `NetworkOnly`(`isPersonalizedSameOriginRequest`)이고, 다음 쪽은 서버 액션 POST다. 코드 읽기 결과이고 실기기 확인이 아니다.

### 프로덕션 적용 순서

아직 적용하지 않았다. 모두 추가 전용이라 옛 코드가 돌아가는 동안 먼저 적용해도 안전하다. **코드 배포 전에** 아래 순서로 적용한다. 새 코드는 첫 쪽부터 `get_social_feed_items`를 부르므로, 마이그레이션이 없으면 소셜 화면이 오류가 된다.

1. `supabase/migrations/20261106090000_monthly_excerpts.sql`
2. `supabase/migrations/20261106100000_monthly_excerpt_candidate_preview.sql`
3. `supabase/migrations/20261106110000_monthly_excerpts_friends.sql`
4. `supabase/migrations/20261106120000_monthly_excerpt_reactions.sql`
5. `supabase/migrations/20261106130000_social_feed_items.sql`

옛 `get_social_feed`는 새 코드 배포를 확인할 때까지 남긴다. 제거는 후속 작업이다.

### 적용 뒤 확인 (할 일, 아직 하지 않음)

권한부터 읽기 전용으로 조회한다. 프로덕션 함수 소유자는 `postgres`이므로 PGlite 결과를 그대로 믿지 않는다.

```sql
select p.proname, p.prosecdef,
  has_function_privilege('anon', p.oid, 'execute') as anon,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('get_social_feed_items', 'friend_feed_monthly_excerpts', 'monthly_excerpt_visible_items');
```

`anon`은 모두 `false`다. `authenticated`는 `monthly_excerpt_visible_items`만 `false`다. `prosecdef`는 `friend_feed_monthly_excerpts`만 `true`다.

두 계정(A: 쓰는 사람, B: 수락된 친구)과 친구가 아닌 계정 C로 실제 화면에서 확인한다. 데이터는 읽기와 쓰기를 모두 테스트 계정의 것으로만 한다.

- [ ] A가 공개로 엮으면 B의 `/social`에 1건 뜨고, 시각 순서대로 기록과 섞인다. C에게는 없다.
- [ ] A가 문장을 고치거나 공개를 껐다 켜도 B의 피드에서 1건이고 자리가 같다.
- [ ] A가 나만 보기로 돌리면 B의 피드와 서재에서 빠진다. 친구를 끊어도 빠진다.
- [ ] 표지 문장을 비공개로 바꾸면 표지가 다음 공개 문장으로 바뀌고 수가 줄어든다. 응답에 비공개 문장이 없다.
- [ ] B가 카드에서 좋아요·댓글을 남기면 A에게 알림이 오고, 카드와 책 화면의 수가 같다.
- [ ] 스크롤로 다음 쪽을 불러와도 항목이 겹치거나 빠지지 않는다.

### 코드를 되돌릴 때

마이그레이션은 되돌리지 않는다. 옛 코드는 새 객체를 쓰지 않으므로 그대로 돈다. 다만 새 코드 배포 뒤 쌓인 `excerpt_like`·`excerpt_comment` 알림이 문제가 된다. 옛 코드의 `buildNotificationMessage`는 모르는 종류에서 예외를 던져 **알림 화면 전체가 오류**가 된다. 이번 변경으로 현재 코드는 중립 문구를 내지만, 이전에 배포된 코드에는 이 처리가 없다.

옛 코드로 되돌렸다면 백업 여부를 먼저 정한 뒤 아래로 복구한다. 지운 알림은 되살릴 수 없고, 좋아요·댓글 자체는 남는다.

```sql
delete from public.notifications where type in ('excerpt_like','excerpt_comment');
```

## 달마다 한 문장 (2026-11-13, DB 적용 완료 · 코드 머지 전)

설계는 [달마다 한 문장 설계](../superpowers/specs/2026-11-13-monthly-sentence-design.md)다. 친구 서재(`/social/u/…`)의 달별 목록이 `달마다 엮은 발췌집`에서 `달마다 한 문장`으로 바뀐다.

**친구에게 새로 보이는 것.** 달마다 공개 기록 하나의 문장, 책 제목, 쪽수, 그 기록으로 가는 링크. 모두 친구가 이미 읽을 수 있던 공개 기록의 값이다. 발췌집을 보여 준 달에는 `펼치기`가 붙는다(이전과 같은 범위).

**친구에게 보이지 않는 것.** 나만 보기 기록의 문장·id, 그달의 기록 수, 문장이 정해진 방식(고름·표지·자동), 자동 기준, 나만 보기 문장을 골랐다는 사실. 나만 보기 문장을 고른 달은 공개 문장 중 하나가 대신 보이고, 공개 문장이 없는 달은 줄이 없다. `nextBefore`도 공개 문장이 있는 달이 더 남았을 때만 채운다. 친구 화면의 '생각 많은 문장' 계산은 친구가 읽을 수 있는 생각만 센다.

**접근 경로.** 두 테이블은 본인 `select`만 열려 있고 쓰기 권한이 없다. 읽기·쓰기는 정의자 RPC 넷뿐이며 모두 안에서 `auth.uid()`, `is_friend_with`(탈퇴 유예 포함), 공개 범위를 확인한다. API 응답은 `private, no-store`다.

**확인한 것(코드).** `supabase/tests/monthly_sentences_contract.sql`의 `private pick`, `private-only month`, `friend reflections`, `friend paging`, `unfriended · stranger`, `pending deletion`, `direct writes` 장면. 친구 응답에 비공개 기록의 id·문장·책 이름과 본인 전용 키가 없는지 `t.no_trace`로 본다.

**적용 순서.** 마이그레이션 `20261113090000_monthly_sentences.sql`은 2026-11-13에 프로덕션에 먼저 적용했다(이력 버전 `20261113125542`). 적용 뒤 기록이 가장 많은 계정으로 읽기 RPC를 불러 응답의 모양(본인 응답, 여섯 줄, 표지·자동 출처, 엮음 상태)만 확인했고 문장 내용은 조회하지 않았다. 새 객체만 더하므로 옛 코드와 함께 돌아도 안전하다. 코드를 먼저 배포하면 일기장과 서재의 이 목록만 "불러오지 못했어요"로 보이고 다른 칸은 그대로다. 대조 결과는 [API 권한 문서](supabase-api-grants.md)에 적었다.

**실제 화면에서 확인할 것.** 두 계정(A: 쓰는 사람, B: 수락된 친구)과 친구가 아닌 계정 C로 확인한다.

- [ ] A가 나만 보기 문장을 고른 달이 B에게 다른 공개 문장으로 보인다. 공개 문장이 없는 달은 B에게 줄이 없다.
- [ ] A가 고른 공개 기록을 나만 보기로 바꾼 직후 B가 서재를 다시 열면 이전 문장이 남아 있지 않다(브라우저와 설치형 PWA 각각).
- [ ] A가 B와 친구를 끊으면 B의 `더 보기`가 더 불러오지 않고, C는 서재 자체를 볼 수 없다.
- [ ] A가 자동 기준을 바꿔도 B의 화면에 기준이 드러나지 않는다.

## 문장 토론 알림 (2026-11-20, DB 적용 완료 · 코드 머지 전)

알림은 수신자만 읽는다는 기존 규칙에 조건을 하나 더했다. 문장 토론 알림(`debate_answer`·`debate_reply`·`debate_move`·`debate_summary`)은 **받은 사람이 지금 그 토론과 답을 볼 수 있을 때만** 보인다(`20261120100000_debate_notifications.sql`의 restrictive 정책 `notifications_hide_unviewable_debate`). 판단은 토론 화면과 같은 `can_view_debate`·`debate_can_see_answer`가 한다.

- 발제자와 친구가 아니게 되면 그 토론의 알림이 목록과 안 읽은 표시에서 빠진다. 다시 친구가 되면 돌아온다.
- 발제자가 숨긴 답글의 알림은 답 쓴 사람에게 보이지 않는다. 숨김을 풀면 돌아온다.
- 답이 자리만 남으면(답글이 있어 본문만 지운 답) 그 답의 알림은 보이지 않는다. 답·토론을 지우면 알림 행도 사라진다.
- 탈퇴 유예 중인 사람이 남긴 알림은 기존 정책(`notifications_hide_pending_deletion`)이 가리고, 유예 중인 사람은 새 알림을 만들지 못한다.
- 알림에 담기는 것은 누가(닉네임·프로필 사진) 어떤 종류의 일을 했는지와 토론 id뿐이다. 답 본문은 담지 않는다.
- 볼 수 없는 토론, 숨긴 답, 남의 답으로는 알림을 만들지 못한다. 수신자는 DB가 정한다.
- 기기 푸시("토론 소식")는 같은 조건을 받는 사람 기준으로 다시 본다(`debate_notification_visible_to`, 발송 전용). 푸시에는 이름·문장·답 본문을 싣지 않고 "토론에 새 소식이 있어요"만 보낸다.

계약 테스트: `supabase/tests/debates_notifications_contract.sql`, `supabase/tests/debates_push_contract.sql`.

### 미검증

- 프로덕션 마이그레이션은 적용하고 스키마·권한·함수 본문을 대조했다. 동작 검증은 PGlite 계약과 단위 테스트다.
- 두 계정 이상으로 실제 화면에서 알림이 오고 가려지는지, iOS 설치형 PWA 실기기.

### 코드를 되돌릴 때

마이그레이션은 되돌리지 않는다. 옛 코드는 모르는 알림 종류에 중립 문구("○○님의 새 소식이 있어요")를 내지만 링크가 친구 화면으로 간다. 오래 되돌려 둘 거라면 아래로 치운다. 지운 알림은 되살릴 수 없고, 답·답글·표시·정리는 남는다.

```sql
delete from public.notifications where type in ('debate_answer','debate_reply','debate_move','debate_summary');
```


## 사진에서 문장 옮기기 (2026-11-20, 코드 머지 전 · DB 미적용)

기록 폼의 "사진으로 옮기기"는 책 페이지 사진을 Google Cloud Vision(미국)으로 보내 글자를 읽는다. 설계는 [사진에서 문장 옮기기 설계](../superpowers/specs/2026-11-20-photo-quote-design.md)다.

### 무엇이 어디로 가는가

- 브라우저가 사진을 긴 변 2,000px 이하의 JPEG로 다시 그린다. 이때 EXIF(위치 등)가 떨어진다. HEIC을 브라우저가 못 열면 변환 모듈(heic-to)을 그때 내려받아 기기 안에서 바꾼다. 변환을 위해 사진을 서버로 보내지 않는다.
- 브라우저 → `POST /api/photo-text`(JPEG 바이트, 2MB 이하) → Vision `images:annotate`(`DOCUMENT_TEXT_DETECTION`). 키는 서버 환경 변수 `GOOGLE_VISION_API_KEY`에만 있고 요청 헤더로 보낸다.
- 서버는 로그인 → 기능 켜짐 → 형식·크기 → 동의 확인과 하루 횟수(`begin_photo_text_read`, 한 번의 RPC) 순으로 확인한 뒤에만 Vision을 부른다. **동의하지 않은 사람의 사진은 Google로 가지 않는다.**
- 응답은 낱말의 글자·좌표·띄어쓰기뿐이다. 고른 문장은 이용자가 기록을 남길 때 비로소 독서 기록으로 저장된다.

### 남기지 않는 것

- 사진과 읽은 글: DB·Storage·서버 로그에 쓰지 않는다. 서버 로그에는 실패했을 때 사용자 id와 실패 종류만 남는다(`app/api/photo-text/__tests__/route.test.ts`가 글과 키가 로그에 없음을 확인한다).
- PWA 캐시: `/api`는 NetworkOnly이고 응답은 `Cache-Control: private, no-store`다. 사진은 고르는 화면이 열린 동안 메모리(blob 주소)에만 있고 닫으면 놓는다. sessionStorage 초안에는 글만 들어간다.
- DB에 남는 것: `photo_text_consents`(동의 시각·문구 판·철회 시각)와 `photo_text_usage`(한국 날짜별 횟수, 지난 날의 줄은 다음 사용 때 지운다). 계정을 지우면 함께 지워진다.

### 동의와 철회

- 처음 누를 때 동의 시트를 보여 주고 `POST /api/photo-text/consent`로 남긴다. 문구를 바꾸면 `PHOTO_TEXT_COPY_VERSION`을 올리고, 올리면 모두에게 다시 묻는다.
- 설정 → 계정 → "사진 글자 읽기 동의"에서 철회한다(`DELETE`). 철회는 기능이 꺼져 있어도, 탈퇴를 신청한 계정도 할 수 있다. 기능이 꺼져 있으면 설정을 열 때 동의 여부를 한 번 조회해 동의한 사람에게만 이 행을 보이고, 철회하면 행이 사라진다. 철회 뒤의 요청은 `consent_required`(403)로 거절되고 사진은 Google로 가지 않는다.
- 같은 탭에서는 동의 여부를 한 번 확인한 뒤 다시 묻지 않는다. 다른 기기에서 철회했다면 다음 사진을 고른 때 서버가 거절하고 동의 시트가 다시 뜬다.
- 하루 30장(한국 시간 자정 초기화). 읽기에 실패해도 횟수는 되돌리지 않는다.

### 방침

- 제1조 7호, 제2조 6호, 제5조 7호, 제7조 3항에 적었다. 12월 13일 개정판의 날짜는 건드리지 않고, 이 항목만의 공고일 `PHOTO_TEXT_PRIVACY_ANNOUNCED`(2026-11-21)와 시행일(2026-11-28)을 따로 둔다. **실제 배포일이 공고일이 되어야 한다. 배포가 늦어지면 두 상수와 부칙 문장을 함께 미룬다.**
- 시행일 전에도 기능 안에서 따로 동의한 이용자에게는 연다. 이 방식이 법적으로 충분한지는 확인하지 못했다(법률 자문 아님).

### 적용 순서

1. 프로덕션에 `20261120120000_photo_text.sql`을 적용한다. 새 객체만 더하므로 옛 코드가 돌아가는 동안 먼저 적용해도 안전하다.
2. Vercel에 `GOOGLE_VISION_API_KEY`(Cloud Vision API로 제한한 새 키)를 넣는다. 실험에 쓴 키는 지운다. Google Cloud에 예산 알림을 건다.
3. 코드를 배포한다. 이 날이 공고일과 같은지 확인한다.
4. `NEXT_PUBLIC_PHOTO_QUOTE_ENABLED=true`를 넣고 다시 배포한다(빌드 시점에 묶이는 값이다). 이 값이 없으면 버튼이 보이지 않고 서버는 `disabled`(404)로 답한다.
5. 기존 이용자에게 새 기능과 사진 전송을 직접 알린다.

### 미검증

- 실제 Vision 호출을 포함한 전체 흐름은 이 저장소의 자동 시험에 없다(Vision은 흉내 낸다). 조작은 실험 페이지에서 사용자가 실기기로 확인했고, 제품 화면의 실기기 확인(iOS Safari, iOS 설치형 PWA, Android Chrome)은 하지 않았다.
- 동시 요청으로 30장을 넘지 못하는지는 단일 연결 DB에서 순차로만 확인했다(조건 있는 upsert와 check 제약이 지킨다).
- 아이폰이 찍은 원본 HEIC 사진.

### 코드를 되돌릴 때

`NEXT_PUBLIC_PHOTO_QUOTE_ENABLED`를 지우고 다시 배포하면 버튼과 서버 경로가 함께 꺼진다. 마이그레이션은 되돌리지 않는다. 동의 기록은 남겨 두고, 동의한 사람은 설정에서 계속 철회할 수 있다.
