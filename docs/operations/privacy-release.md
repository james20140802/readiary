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
| 가입 시 만 14세·동의 확인 | `ConsentFieldset`, `lib/auth/consent.ts`, 가입·온보딩 흐름의 기존 확인 유지. Google 로그인 단계에서 인증 계정이 먼저 만들어지는 점은 약관에 명시. 생년월일이나 연령 증빙을 수집하는 방식은 아님. |
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

- 탈퇴 요청자의 본인 여부를 확인하고 10일 이내 처리한다. 인증 세션을 해지하고 새 로그인을 차단한 뒤 처리한다. 단순 계정 삭제만으로 이미 발급한 액세스 토큰이 즉시 무효화된다고 가정하지 않는다.
- `profiles` 버킷에서 해당 사용자 UUID 폴더의 파일을 페이지 단위로 끝까지 조회하고 Storage API로 삭제한다. 현재 프로필 사진뿐 아니라 예전 버전에서 버려진 업로드도 포함한다. Storage 메타데이터 행을 SQL로 직접 삭제하지 않는다.
- 파일 삭제 완료를 확인한 뒤 Auth 사용자를 삭제하고 연결된 프로필·책장·기록·관계·좋아요·댓글·알림이 제거됐는지 확인한다. 파일 삭제 실패를 탈퇴 완료로 기록하지 않는다.
- 기존 미사용 파일 또는 업로드 도중 브라우저가 종료되어 남은 파일은 프로필 참조와 충분한 유예 시간을 대조해 별도로 정리한다. 이 PR은 기존 파일을 대량 삭제하지 않는다. 새 정책은 미참조 파일을 다른 회원에게 공개하지 않는다.
- 백업 복구 때는 이미 완료한 삭제 요청을 다시 반영한다. 법령상 보관할 별도 항목이 있으면 항목·근거·기간을 기록하고 기간 종료 후 삭제한다.

참고: [Supabase 비공개 버킷](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Storage 접근 정책](https://supabase.com/docs/guides/storage/security/access-control), [Pretendard v1.3.9](https://github.com/orioncactus/pretendard/tree/v1.3.9). 글꼴 라이선스는 `app/fonts/Pretendard-LICENSE.txt`에 포함한다.

## 운영 보안 점검 기록

읽기 전용 Supabase Advisor는 공개 공유 RPC와 인증된 알림·진도 RPC의 SECURITY DEFINER 권한을 표시했다. 공개 공유 RPC는 위 마이그레이션의 명시적 공유 조건으로 범위를 제한하고, 기존 알림·진도 RPC는 호출자 검사를 유지한다. `rls_auto_enable` 이벤트 트리거의 실행 권한, 유출 비밀번호 차단 설정, Postgres 보안 패치 적용은 별도 운영 점검 항목으로 남긴다. 이 PR에서 운영 인증 설정이나 DB 버전을 변경하지 않았다. [함수 실행 권한 안내](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [유출 비밀번호 보호](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [DB 업그레이드](https://supabase.com/docs/guides/platform/upgrading).
