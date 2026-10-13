-- Synthetic data only. Expected: accounts=3, repeat_denominator=2, repeat_numerator=1, repeat_pending=1.
with users_fixture(id,created_at,deleted_at,is_anonymous) as (values
('00000000-0000-0000-0000-000000000001'::uuid,'2026-09-01Z'::timestamptz,null::timestamptz,false),
('00000000-0000-0000-0000-000000000002'::uuid,'2026-09-01Z'::timestamptz,null::timestamptz,false),
('00000000-0000-0000-0000-000000000003'::uuid,'2026-09-01Z'::timestamptz,null::timestamptz,false)),
books_fixture(id,user_id,created_at) as (select id,id,created_at from users_fixture),
profiles_fixture as (select id,created_at from users_fixture),
entries_fixture(user_book_id,created_at) as (values
('00000000-0000-0000-0000-000000000001'::uuid,'2026-09-29T18:30Z'::timestamptz),
('00000000-0000-0000-0000-000000000001'::uuid,'2026-10-06T18:30Z'::timestamptz),
('00000000-0000-0000-0000-000000000002'::uuid,'2026-09-28T18:30Z'::timestamptz),
('00000000-0000-0000-0000-000000000002'::uuid,'2026-10-12T18:30Z'::timestamptz),
('00000000-0000-0000-0000-000000000003'::uuid,'2026-10-12T18:30Z'::timestamptz)),
params as (
 select '2026-10-13T18:30:00Z'::timestamptz as cutoff, array[]::uuid[] as excluded
), accounts as (
 select u.id,u.created_at from users_fixture u cross join params p
 where u.deleted_at is null and not u.is_anonymous and u.created_at<p.cutoff
 and not(u.id=any(p.excluded))
), records as (
 select b.user_id,e.created_at from entries_fixture e
 join books_fixture b on b.id=e.user_book_id join accounts a on a.id=b.user_id
 cross join params p where e.created_at<p.cutoff
), stats as (
 select user_id,count(*) as n,min(created_at) as first_at,
 count(distinct (created_at at time zone 'Asia/Seoul')::date) as days
 from records group by user_id
), readers as (
 select a.*,s.n,s.first_at,s.days,
 exists(select 1 from profiles_fixture x where x.id=a.id and x.created_at<p.cutoff) as profile,
 exists(select 1 from books_fixture x where x.user_id=a.id and x.created_at<p.cutoff) as book,
 s.first_at+interval '336 hours'<=p.cutoff as eligible,
 exists(select 1 from records r where r.user_id=a.id
 and r.created_at>=s.first_at+interval '168 hours'
 and r.created_at<s.first_at+interval '336 hours') as returned
 from accounts a cross join params p left join stats s on s.user_id=a.id
)
select (select cutoff from params) as cutoff_utc,now() as executed_at_utc,
 (select count(distinct x) from params,unnest(excluded) as t(x)) as exclusion_list_size,
 (select count(*) from users_fixture u cross join params p where u.id=any(p.excluded)
 and u.deleted_at is null and not u.is_anonymous and u.created_at<p.cutoff) as excluded_accounts,
 count(*) as accounts,count(*) filter(where profile) as with_profile,
 count(*) filter(where book) as with_book,count(*) filter(where n>=1) as with_first_record,
 count(*) filter(where n>=2) as with_followup_record,
 count(*) filter(where days>=2) as multiple_kst_days,
 count(*) filter(where eligible) as repeat_denominator,
 count(*) filter(where eligible and returned) as repeat_numerator,
 count(*) filter(where n>=1 and not eligible) as repeat_pending,
 count(*) filter(where first_at<created_at) as first_before_signup,
 percentile_cont(0.5) within group(order by extract(epoch from(first_at-created_at))/3600)
 filter(where first_at>=created_at) as signup_to_first_median_hours,
 (select count(*) from entries_fixture e join books_fixture b on b.id=e.user_book_id
 join accounts a on a.id=b.user_id where e.created_at is null) as missing_entry_times
from readers;
