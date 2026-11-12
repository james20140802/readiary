# Supabase Data API 권한 명시

2026-10-30부터 Supabase는 `public`에 새로 만들거나 다시 만든 테이블에 `anon`·`authenticated`·`service_role` 권한을 자동으로 주지 않는다. 권한이 없으면 RLS를 보기 전에 `42501 permission denied`로 막힌다. 이미 있는 테이블의 권한은 그대로 남는다. 근거: [Supabase changelog #45329](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).

## 2026-10-30 점검 결과

- 프로덕션(`readiary`) `public` 테이블 19개, 뷰·시퀀스 없음. `anon`은 어느 테이블에도 권한이 없다(`20260904000000_reclaim_rls_policies.sql`). 점검 시점의 기본 권한은 아직 옛 값(세 역할에 자동 부여)이었다.
- Supabase 개발 브랜치는 없다. 별도 개발 프로젝트도 없다(목킹으로 대체).
- 권한을 이미 명시한 테이블: `push_*` 5개, `email_*` 3개.
- 기본 권한에 기대던 테이블:
  - 저장소 밖(대시보드)에서 만든 핵심 테이블: `books`, `comments`, `entries`, `friends`, `likes`, `profiles`, `user_books`
  - `notifications`(`authenticated`·`service_role` 모두)
  - `book_registration_requests`·`entry_reflections`·`feature_rollouts`(`service_role`만)
- 함수 실행 권한은 클라이언트가 부르는 RPC마다 마이그레이션에 명시돼 있다. 위 changelog의 SQL도 테이블과 시퀀스만 다룬다.

`20261030090000_explicit_table_api_grants.sql`이 이 테이블들의 권한을 프로덕션과 같게 적는다. 친구·알림의 update는 기존 열 단위 권한만 남긴다. 클라이언트가 쓰지 않는 `TRUNCATE`·`TRIGGER`·`REFERENCES`·`MAINTAIN`은 적지 않아서, 다시 만든 환경은 프로덕션보다 좁다. 프로덕션에서 이 SQL을 트랜잭션 안에서 실행하고 롤백해 보니 19개 테이블의 권한이 하나도 바뀌지 않았다.

## 처음부터 다시 만드는 경로: 기준(baseline) 마이그레이션

저장소 마이그레이션만으로는 빈 DB를 만들 수 없었다. 첫 마이그레이션(`20260825000000_sentence_centric_foundation.sql`)부터 `profiles`·`entries`를 참조하지만, 핵심 테이블 7개(`books`·`comments`·`entries`·`friends`·`likes`·`profiles`·`user_books`)를 만드는 마이그레이션이 없었다 — 전부 저장소 밖(대시보드)에서 만들어졌다.

`supabase/migrations/20260824000000_core_schema_baseline.sql`이 이 7개 테이블을 2026-08-25 이전(=첫 저장소 마이그레이션 적용 직전) 프로덕션 상태로 다시 만든다. 뒤에 오는 저장소 마이그레이션이 더하는 컬럼·제약·인덱스·정책(예: `entries.note`·`quote`, `user_books.finished_at`, `profiles.featured_entry_id`, 8개 테이블의 RLS 정책 전체)은 이 파일에서 만들지 않는다 — 특히 RLS 정책은 `20260904000000_reclaim_rls_policies.sql`이 이름과 무관하게 전부 지우고 다시 만드는 단일 진실이므로, 기준 마이그레이션은 정책을 두지 않는다. 권한은 이 문서의 "새 테이블 규칙"을 따른다(anon은 받지 않고, authenticated·service_role은 2026-10-30 프로덕션 조회값과 같다).

`notifications`은 `20260825000000`이 이미 만드므로 기준 마이그레이션의 대상이 아니다. `book_registration_requests`·`entry_reflections`·`feature_rollouts`도 각자의 생성 마이그레이션이 권한을 직접 명시하므로 대상이 아니다.

이 파일은 프로덕션에 적용하지 않는다 — 프로덕션에는 이미 같은 객체가 있다. 목적은 "빈 DB + 저장소 마이그레이션 전체"로 지금의 프로덕션 `public` 스키마를 재현하는 것뿐이다(dev·preview 환경을 새로 만들 때 쓴다).

### 확인: 전체 마이그레이션 체인 계약 테스트

`supabase/tests/run-migration-chain-contract.mjs`가 빈 PGlite DB에 `supabase/migrations/`의 모든 파일을 파일명 순서로 적용하고, 결과 스키마(테이블·컬럼·제약·인덱스·RLS 활성화·정책·함수 시그니처·역할별 테이블 권한)를 `supabase/tests/fixtures/prod-public-schema.json`(2026-10-30 프로덕션 읽기 전용 조회 결과)과 비교한다.

```sh
npm install --prefix /tmp/readiary-grants-sql --no-save --package-lock=false @electric-sql/pglite@0.5.8
PGLITE_MODULE=/tmp/readiary-grants-sql/node_modules/@electric-sql/pglite/dist/index.js \
  node supabase/tests/run-migration-chain-contract.mjs
```

받아들이는 차이(테스트 안 주석에도 적음):

- **테이블 권한의 TRUNCATE·TRIGGER·REFERENCES·MAINTAIN** — 비교하지 않는다. 클라이언트가 쓰지 않고, 2026-10-30 이전에 기본 권한으로 만들어진 프로덕션 테이블에는 남아 있지만 이 저장소가 다시 만드는 환경은 주지 않는다(위 "2026-10-30 점검 결과" 절과 같은 의도).
- **storage 스키마** — 버킷·정책의 정확한 일치는 보지 않는다. `private_profile_images` 마이그레이션이 적용되는지(storage DDL을 받아들이는지)만 확인한다.
- **`rls_auto_enable`** — Supabase 플랫폼이 새 테이블에 붙이는 이벤트 트리거 함수. 앱 마이그레이션이 만들지 않고 PGlite도 이벤트 트리거를 지원하지 않아 애초에 나타나지 않는다.
- **함수 본문의 글자 단위 일치** — 이름과 인자 시그니처만 비교한다. `pg_get_functiondef`의 포매팅은 PG 버전마다 흔들린다.
- **pg_cron/pg_net** — 저장소 마이그레이션은 `cron.schedule`을 호출하지 않는다(웹 푸시 발송은 운영 설정으로 예약한다 — 아래 이력 차이 참고). 확장 설치 여부는 보지 않는다.

#### 픽스처의 예상치: 아직 프로덕션에 없는 것

체인 계약이 깨지지 않도록, 머지 전 마이그레이션의 결과를 픽스처에 미리 적는다. 픽스처에 있다고 프로덕션에 적용된 것은 아니다.

- `20261106090000_monthly_excerpts.sql`(달의 발췌집 테이블 2개, 정책 3개, 함수 12개): 프로덕션 미적용. 이 부분은 조회 결과가 아니라 예상치다. 적용한 뒤 읽기 전용 조회로 대조하고 이 항목을 지운다.
- `20261106100000_monthly_excerpt_candidate_preview.sql`(`get_monthly_excerpt_candidates`를 같은 서명으로 다시 만들어 응답 키 추가): 프로덕션 미적용. 위와 같이 예상치다.
- `20261106110000_monthly_excerpts_friends.sql`(친구용 RPC 4개, 내부 함수 1개): 프로덕션 미적용. 위와 같이 예상치다.
- `20261106120000_monthly_excerpt_reactions.sql`(좋아요·댓글 테이블 2개, 정책 6개, RPC 3개, `notifications`의 열 2개·인덱스 3개·넓힌 `type` 검사): 프로덕션 미적용. 위와 같이 예상치다.
- `20261106130000_social_feed_items.sql`(피드 RPC `get_social_feed_items`, 정의자 함수 `friend_feed_monthly_excerpts`): 프로덕션 미적용. 위와 같이 예상치다.

#### 탈퇴 마이그레이션: 2026-11-12 프로덕션 적용

`20261112090000_account_deletions.sql`, `20261112091000_account_deletion_visibility.sql`, `20261112092000_account_deletion_writes.sql`은 2026-11-12에 SQL Editor로 직접 적용했고, `schema_migrations` 이력은 파일 이름 버전으로 넣었다. 적용 뒤 읽기 전용 조회로 테이블 2개, 탈퇴 함수 8개, 숨김 정책 7개, 쓰기 차단 정책 29개, 확인 줄이 들어간 쓰기 함수 11개, `is_account_active`의 anon 실행 불가, `request_account_deletion`의 authenticated 실행 불가를 대조했다. 픽스처의 해당 값은 이 대조로 확인한 예상치다.

### CI에서 자동으로 도는 DB 테스트

`main`으로 가는 PR과 `main` push마다 `.github/workflows/db-contract.yml`이 임시 DB에서 계약 테스트를 실행한다. 프로덕션에 접속하지 않으므로 시크릿을 주지 않는다. 로컬에서는 `npm run test:db`로 같은 PGlite 테스트를 돌린다.

- `supabase/tests/run-*-contract.mjs`는 자동으로 포함된다. 새 테스트는 이름만 맞추면 된다.
- `run-registration-contract.py`는 동시 요청을 검증하려고 CI가 띄운 Postgres 17 컨테이너에서 따로 실행한다.

`run-*-rls-contract.mjs`와 `run-entry-visibility-contract.mjs`는 마이그레이션 전체를 적용한 뒤, 기록 주인·수락한 친구·수락 전 친구·모르는 사람·비로그인 사용자의 역할로 직접 쿼리해 `public` 테이블과 프로필 이미지 저장소의 접근 규칙을 확인한다. 정책을 추가하거나 바꾸는 PR은 이 테스트도 같은 PR에서 고친다.

거부를 확인하는 INSERT·UPDATE·DELETE에는 `returning`이나 `where`를 붙이지 않는다. 이것들이 있으면 SELECT 정책도 함께 적용되어, 확인하려는 정책이 풀려도 테스트가 통과할 수 있다.

스키마를 바꾸는 마이그레이션 PR은 `prod-public-schema.json`을 같은 PR에서 갱신하고 `_captured`에 이유를 적는다. 갱신하지 않으면 체인 테스트가 실패한다.

CI 통과만으로 확인되지 않는 것:

- 마이그레이션을 프로덕션에 적용했는지. 코드를 배포하기 전에 따로 적용하고 확인한다.
- 대시보드 등에서 프로덕션을 직접 바꾼 차이. 스냅샷은 사람이 갱신한 기록이다.
- 테스트에 적지 않은 규칙. 새 테이블이나 정책을 추가해도 동작 테스트는 자동으로 생기지 않는다. 체인 테스트는 정책의 이름·명령·역할만 비교한다.
- 실제 Storage API의 동작. 저장소 테스트는 임시 DB의 스텁에서 DB 정책만 확인한다.
- `service_role`로 처리하는 경로와 `security definer` 함수 안의 규칙. RLS를 거치지 않으므로 각 함수의 계약 테스트가 따로 다룬 범위만 확인된다.
- 실제 데이터에서 생기는 문제와 프로덕션 장애.

### 프로덕션 이력 정리

`supabase_migrations.schema_migrations`와 저장소 파일명을 2026-10-30에 읽기 전용으로 대조했고, 2026-11-05에 일부를 정리했다.

**프로덕션에 `supabase db push`를 쓰지 않는다.** 아래 "남은 차이" 때문에 이력과 파일이 아직 일치하지 않는다. 번호가 다른 파일은 도구가 미적용으로 볼 수 있으므로, 마이그레이션은 SQL Editor나 MCP로 파일 하나씩 적용한다.

#### 정리한 것 (2026-11-05)

이력에 없던 파일 3개를 "적용됨"으로 기록했다. SQL Editor에서 아래 문장만 실행했고, 마이그레이션 내용은 다시 실행하지 않았다. 이력은 31행에서 34행이 됐다.

```sql
insert into supabase_migrations.schema_migrations (version, name)
values
  ('20260824000000', 'core_schema_baseline'),
  ('20260825000000', 'sentence_centric_foundation'),
  ('20260826000000', 'harden_entries_and_notifications')
on conflict (version) do nothing
returning version, name;
```

- `20260825000000`·`20260826000000`은 SQL Editor로 수동 적용돼 있었다. 기록 전에 `notifications` 테이블, `entries.note`·`quote`, `entries_content_check`·`entries_page_order_check`, `notifications.read_at` 수정 권한이 있는지 확인했다.
- `20260824000000_core_schema_baseline.sql`은 빈 DB를 만들 때만 쓰는 파일이라 프로덕션에서 실행한 적이 없고, 실행하면 안 된다. 이 파일의 `revoke all`은 7개 테이블의 권한을 지웠다가 다시 주는데, `friends`의 컬럼 단위 수정 권한(`status`, `accepted_at`)은 다시 주지 않는다. 기록은 이 파일이 미적용으로 잡히지 않게 하려는 것이다.
- 기록 뒤 `friends` 수정 권한, `anon` 테이블 권한 0개, RLS가 꺼진 테이블 0개가 그대로인 것을 확인했다.

#### 남은 차이 (사람이 결정할 일)

- `20260829000000_notification_rpcs.sql` 하나가 이력의 두 행(`20260830061953 notification_rpcs`, `20260830062042 notification_rpcs_revoke_anon`)에 대응한다. 나중에 저장소로 회수하며 한 파일로 합쳤다.
- 그 밖의 저장소 파일은 이력과 1:1로 대응하지만 버전이 다르다. 수동으로 적용한 시각이 파일명과 다르기 때문이다. 예: `20260831000000_add_finished_at.sql` ↔ `20260830204724`, `20260912161000_monthly_quote_previews.sql` ↔ `20260914152441`, `20261030120000_entry_months.sql` ↔ `20261102055759`.
- **이력에만 있고 저장소에 없는 행**: `20260907162949 enable_push_cron_extensions`. 웹 푸시에 필요한 확장(추정: `pg_cron`·`pg_net`)을 대시보드에서 직접 켠 것으로 보이며, 저장소 마이그레이션에는 반영되지 않았다. 체인 테스트와 기준 마이그레이션은 이 간극을 다루지 않는다. 확장 활성화는 운영 설정이라 별도 확인이 필요하다.

버전이 다른 파일들은 내용이 이미 적용돼 있고 이력에도 다른 번호로 기록돼 있다. 번호를 맞추려면 기존 행을 지우고 새 번호로 다시 넣어야 하므로, 이 문서는 그 SQL을 적지 않는다. 필요하면 사람이 대상 행을 확인하고 직접 결정한다. `enable_push_cron_extensions`도 저장소 파일을 만들지 이력만 둘지 운영 담당자가 정한다.

## 새 테이블 규칙

테이블을 만드는 마이그레이션에서 아래를 한 묶음으로 쓴다. 하나라도 빠지면 Data API가 막히거나 넓게 열린다.

```sql
create table public.example (...);
alter table public.example enable row level security;
revoke all on public.example from public, anon, authenticated;
grant select, insert, update, delete on public.example to authenticated; -- 필요한 것만, 열 단위 가능
grant all on public.example to service_role;                            -- 서버가 다룰 때
create policy ... ;
```

## 확인 방법

로컬 계약 테스트(원격 연결 없음):

```sh
npm install --prefix /tmp/readiary-grants-sql --no-save --package-lock=false @electric-sql/pglite@0.5.8
PGLITE_MODULE=/tmp/readiary-grants-sql/node_modules/@electric-sql/pglite/dist/index.js \
  node supabase/tests/run-api-grants-contract.mjs
```

실제 DB의 역할별 권한(읽기 전용):

```sql
select c.relname, r.rolname, string_agg(a.privilege_type, ',' order by a.privilege_type)
from pg_class c
cross join lateral aclexplode(c.relacl) a
join pg_roles r on r.oid = a.grantee
where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
  and r.rolname in ('anon', 'authenticated', 'service_role')
group by 1, 2 order by 1, 2;
```
