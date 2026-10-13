-- Read-only. Edit parameters in a private copy; never commit account UUIDs.
with params as (
 select '2026-10-13T18:30:00Z'::timestamptz as cutoff, array[]::uuid[] as excluded
), accounts as (
 select u.id,u.created_at from auth.users u cross join params p
 where u.deleted_at is null and not u.is_anonymous and u.created_at<p.cutoff
 and not(u.id=any(p.excluded))
), records as (
 select b.user_id,e.created_at from public.entries e
 join public.user_books b on b.id=e.user_book_id join accounts a on a.id=b.user_id
 cross join params p where e.created_at<p.cutoff
), stats as (
 select user_id,count(*) as n,min(created_at) as first_at,
 count(distinct (created_at at time zone 'Asia/Seoul')::date) as days
 from records group by user_id
), readers as (
 select a.*,s.n,s.first_at,s.days,
 exists(select 1 from public.profiles x where x.id=a.id and x.created_at<p.cutoff) as profile,
 exists(select 1 from public.user_books x where x.user_id=a.id and x.created_at<p.cutoff) as book,
 s.first_at+interval '336 hours'<=p.cutoff as eligible,
 exists(select 1 from records r where r.user_id=a.id
 and r.created_at>=s.first_at+interval '168 hours'
 and r.created_at<s.first_at+interval '336 hours') as returned
 from accounts a cross join params p left join stats s on s.user_id=a.id
)
select (select cutoff from params) as cutoff_utc,now() as executed_at_utc,
 (select count(distinct x) from params,unnest(excluded) as t(x)) as exclusion_list_size,
 (select count(*) from auth.users u cross join params p where u.id=any(p.excluded)
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
 (select count(*) from public.entries e join public.user_books b on b.id=e.user_book_id
 join accounts a on a.id=b.user_id where e.created_at is null) as missing_entry_times
from readers;
