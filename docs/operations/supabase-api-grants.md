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

### 프로덕션 이력 정리(실행하지 않음 — 사람이 결정할 일)

`supabase_migrations.schema_migrations`(읽기 전용 조회, 2026-10-30)와 저장소 파일명을 대조한 결과:

- `20260825000000_sentence_centric_foundation.sql`, `20260826000000_harden_entries_and_notifications.sql`, 그리고 새로 추가한 `20260824000000_core_schema_baseline.sql`은 이력 테이블에 없다(앞 둘은 SQL Editor로 수동 적용됐다고 알려져 있었다 — 이번 조회로 재확인. 기준 마이그레이션은 프로덕션에 애초에 적용하지 않는다).
- `20260829000000_notification_rpcs.sql` 하나가 이력 테이블의 두 행(`20260830061953 notification_rpcs`, `20260830062042 notification_rpcs_revoke_anon`)에 대응한다 — 나중에 저장소로 회수하며 한 파일로 합쳤다.
- 그 밖의 저장소 파일은 이력 테이블과 1:1 대응하지만 버전(타임스탬프)이 다르다(수동 적용 시각과 파일명이 다르다) — 예: `20260831000000_add_finished_at.sql` ↔ `20260830204724`, `20260912161000_monthly_quote_previews.sql` ↔ `20260914152441`.
- **이력 테이블에만 있고 저장소에 없는 행**: `20260907162949 enable_push_cron_extensions`. 웹 푸시에 필요한 확장(추정: `pg_cron`·`pg_net`)을 대시보드에서 직접 켠 것으로 보이며, 저장소 마이그레이션에는 반영되지 않았다. 이 체인 테스트와 기준 마이그레이션은 이 간극을 다루지 않는다 — 확장 활성화는 운영 설정이라 별도 확인이 필요하다.

CLI로 로컬 파일명과 이력을 맞추려면(저장소 마이그레이션의 실제 SQL은 전혀 다시 실행하지 않는다 — 이력 테이블 행만 바뀐다):

```sh
# 새 기준 마이그레이션과 그 이전 2개를 "적용됨"으로만 기록한다(SQL 실행 없음)
supabase migration repair 20260824000000 --status applied
supabase migration repair 20260825000000 --status applied
supabase migration repair 20260826000000 --status applied
```

또는 같은 일을 SQL로 직접(이력 테이블에만 기록, 프로덕션 DDL은 건드리지 않음):

```sql
insert into supabase_migrations.schema_migrations (version, name)
values
  ('20260824000000', 'core_schema_baseline'),
  ('20260825000000', 'sentence_centric_foundation'),
  ('20260826000000', 'harden_entries_and_notifications')
on conflict (version) do nothing;
```

`20260829000000_notification_rpcs.sql`과 날짜가 다른 나머지 파일들은 실제 내용이 이미 적용돼 있고 이력 테이블에도 (다른 버전으로) 기록돼 있으므로, 버전 번호만 맞추려면 기존 행을 지우고 새 버전으로 다시 넣어야 한다 — 이미 있는 이력 행을 지우는 작업이라 이 문서는 그 SQL을 적지 않는다. 필요하면 사람이 대상 행을 확인하고 직접 결정한다. `enable_push_cron_extensions`도 마찬가지로, 대응하는 저장소 파일을 만들지 이력만 둘지는 운영 담당자가 정한다.

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
