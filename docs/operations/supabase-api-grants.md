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

## 남은 공백: 처음부터 다시 만드는 경로

저장소 마이그레이션만으로는 빈 DB를 만들 수 없다. 첫 마이그레이션(`20260825000000_sentence_centric_foundation.sql`)부터 `profiles`·`entries`를 참조하지만, 핵심 테이블 7개를 만드는 마이그레이션이 없다. 계약 테스트는 `supabase/tests/privacy-fixture-schema.sql`로 그 자리를 대신한다. dev·preview 환경을 새로 만들려면 먼저 프로덕션 스키마의 기준 마이그레이션(baseline)이 필요하다. 그 기준에도 이 문서의 권한 규칙을 적용한다. 이 작업은 별도 범위로 남긴다.

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
