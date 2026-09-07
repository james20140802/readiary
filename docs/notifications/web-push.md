# Web Push

기존 좋아요·댓글·친구 요청·수락 인앱 알림은 그대로 둔다. 이 기능은 사용자가 별도로 선택한 독서 소식을 휴대폰으로 보낸다.

## 정책

| 종류 | 조건 |
| --- | --- |
| 기록 리마인드 | 읽는 책이 있고 마지막 기록 후 3일(기록이 없으면 동의 후 3일), 주 1회 이하 |
| 완독 감상 | 동의 이후 완독한 책의 7일 후, 완독 이후 비어 있지 않은 단상이 없으면 책당 1회 |
| 주간 회고 | 일요일, 최근 7일 기록이 있을 때 |
| 지난 문장 | 동의 후 14일 경과, 격주 이하, 30일 이전 문장 중 최근 발송하지 않은 문장 |
| 친구 새 기록 | 수요일, 최근 7일/마지막 피드 확인 이후의 수락한 친구 공개 기록 요약 |

종류를 모두 합쳐 rolling 7일 최대 2회, 최소 48시간 간격. 같은 시점의 후보를 한 푸시로 묶는다. 선택한 시간대·요일의 9~21시에만 발송을 시도한다. 내용이 없거나 이미 확인했으면 생략한다. 응답 없는 리마인드 2회 이후에는 쉰다(발송 이력 보관 범위 90일). 완독 알림은 한 번에 최대 5권을 묶고 책별 중복 방지는 해당 책 삭제까지 유지한다.

별도 감상 필드가 없어 `finished_at` 이후 작성한 비어 있지 않은 `entries.note`를 감상으로 판단한다. 지난 문장은 화면에 실제 들어온 회상 카드와 소식 확인 이력을 사용한다. 친구 요약은 피드를 본 뒤의 새 기록만 대상으로 삼는다. 주간 회고는 최근 7일 기록 50개까지 보여준다.

## 배포

1. 선행 PR #95 위에서 시작한 `feat/web-push-reminders` 브랜치다. PR #95 머지 또는 base 조정 후 반영한다.
2. `supabase/migrations/20260907120231_web_push_reminders.sql` 적용. 기존 계정은 자동 동의되지 않는다.
3. `node scripts/generate-push-keys.mjs`로 키를 한 번 생성한다. `.env.push.local`은 gitignore 대상이고 0600 권한이다. VAPID 키를 배포마다 재생성하면 기존 구독이 끊기므로 유지한다.
4. 서버 환경변수: `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`(연락 가능한 mailto/https URL), `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `PUSH_ENABLED=false`. 공개 키는 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. 기존 Supabase URL/anon 키도 필요하다. Preview에서는 항상 false로 유지한다.
5. 개인정보처리방침 공고·시행일을 실제 공개 일정과 맞춘다. 기존 방침의 사전 공고 기간을 반영한 뒤 Production의 `PUSH_ENABLED=true`로 전환한다. 이 문서와 코드의 날짜는 배포 전에 확인한다.
6. production build/HTTPS로 배포한다. next-pwa는 development에서 비활성이다. 생성된 `sw.js`가 `worker-*.js`를 import하고 push/notificationclick 핸들러가 있는지 확인한다. 기존 personalized NetworkOnly/cacheStartUrl=false 설정을 유지한다.
7. Supabase에서 pg_cron/pg_net을 활성화한다. Vault에 `readiary_push_url`(운영 /api/cron/push 전체 HTTPS URL), `readiary_cron_secret`(서버와 동일)을 저장한다. `supabase/operations/enable-push-cron.sql`로 5분 간격 점검과 매일 이력 정리를 설치한다. Vercel Cron을 중복 예약하지 않는다.
8. 사용자가 설정에서 종류를 선택하고 직접 알림 허용/구독한다. iPhone은 iOS 16.4 이상 홈 화면 웹앱, Android는 지원 브라우저가 필요하다.

## 운영 특성

- 잘못된 cron 인증은 401. 비활성/환경변수 미설정은 enabled:false. 응답에는 claimed/sent 집계만 포함한다. 사용자·endpoint·키·payload를 로그에 남기지 않는다.
- 한 호출은 5명, 사용자당 10기기, 기기당 timeout 5초. 사용자끼리 병렬, 기기는 순차. 같은 시간대 대상이 한 시간에 60명을 넘으면 예약 빈도/처리 용량을 늘려야 한다.
- DB claim은 중복 예약을 막는다. 실패·불명확한 결과도 발송 한도를 소비하고 자동 재전송하지 않는다. 중복 방지를 위해 실패한 완독 알림도 자동 재시도하지 않는다. 사업자 접수 성공은 실제 기기 표시를 보장하지 않는다.
- 404/410 구독 삭제. 매 기기 발송 직전 동의·등록·기록·친구 관계를 다시 확인한다. 이후 이미 사업자에 전달된 알림은 회수할 수 없어 원문·친구 이름·책 제목을 푸시에 넣지 않는다. 클릭 후 본문은 기존 인증/RLS로 확인한다.
- 전체 끄기는 모든 서버 구독 삭제, 이 기기 끄기는 해당 구독 해제. 로그아웃/계정 변경 시에도 기기 구독 해제를 시도한다. 이미 표시된 알림은 기기 설정/네트워크 상태의 영향을 받는다.
- 이력은 매일 90일 초과분을 정리한다. 완독 중복 방지용 책 ID는 책 삭제/탈퇴 시 지운다. 계정 삭제는 모든 새 테이블에 cascade된다.
- 휴대폰 집중 모드·권한·네트워크에 따라 표시와 도착 시간이 달라진다. TTL은 1시간이다.

## 검증

```sh
npm test -- lib/push/__tests__ lib/notifications/__tests__ lib/pwa/__tests__
PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node supabase/tests/run-push-contract.mjs
npx tsc --noEmit
npm run build
```

실기기 확인: 앱 닫힘/잠금 수신, 탭 시 본인 소식함, 종류/요일/시간대 변경, 기기별·전체 해제, 로그아웃·계정 교체, 만료 구독, cron 중복 실행, 권한 거절, iOS 홈 화면 미설치 안내. 운영 마이그레이션·설정·실기기 전송은 로컬/모의 테스트만으로 완료라 표시하지 않는다.

참고: [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart), [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net), [web-push](https://github.com/web-push-libs/web-push), [WebKit iOS Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
