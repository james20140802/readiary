-- Only executed in the isolated in-memory fixture schema.
insert into auth.users(id) values
('00000000-0000-4000-8000-000000000001'),
('00000000-0000-4000-8000-000000000002'),
('00000000-0000-4000-8000-000000000003');
insert into public.profiles(id,name,nickname,tag) select id,'Test',id::text,'0001' from auth.users;
insert into public.books(id,title) values ('00000000-0000-4000-8000-000000000010','Book');
insert into public.user_books(id,user_id,book_id) values
('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000010'),
('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000010');
insert into public.entries(user_book_id,date,quote,from_page,to_page,is_private,created_at)
select '00000000-0000-4000-8000-000000000011','2026-08-10','Private '||i,100,100,true,'2026-08-10'::timestamptz+i*interval '1 second'
from generate_series(1,1005) i;
insert into public.entries(id,user_book_id,date,quote,note,is_private,created_at) values
('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000011','2025-09-06','Anniversary',null,true,'2025-09-06'),
('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000011','2026-09-06',null,'Latest note',false,'2026-09-06'),
('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000012','2026-09-06','Friend public',null,false,'2026-09-06'),
('00000000-0000-4000-8000-000000000023','00000000-0000-4000-8000-000000000012','2026-09-06','Friend private',null,true,'2026-09-06');
-- Reverse-direction friendship is also included in the feed.
insert into public.friends(user_id,friend_id,status) values
('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','accepted');
insert into public.likes(user_id,entry_id) values
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000022');
insert into public.comments(user_id,entry_id,content) values
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000022','Comment');

set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',false);
do $$ declare result jsonb; begin
  result := public.get_dashboard_core('2026-09-06');
  if jsonb_array_length(result->'books')<>1 or (result->>'weeklyCount')::int<>1
    or result->'weekActivity'<>'[true,false,false,false,false,false,false]'::jsonb then raise exception 'Core weekly/own books mismatch'; end if;
  if result->'latestTexts'->>'00000000-0000-4000-8000-000000000011'<>'Latest note' then raise exception 'Latest note missing'; end if;
  if jsonb_array_length(result->'recentEntries')<>6 then raise exception 'Recent entries unbounded'; end if;
  if position('T' in result->'recentEntries'->0->>'createdAt')=0 then raise exception 'Timestamp lost ISO format'; end if;
  result := public.get_reading_stats('00000000-0000-4000-8000-000000000001');
  if (result->>'totalEntries')::int<>1007 or (result->>'totalPages')::int<>1005 then raise exception 'Aggregate truncated or inclusive pages wrong'; end if;
  result := public.get_book_reading_stats();
  if (result->'00000000-0000-4000-8000-000000000011'->>'entryCount')::int<>1007 then raise exception 'Book stats truncated'; end if;
  result := public.get_monthly_recap('2026-09-01');
  if result->>'label'<>'2026년 8월' or (result->>'entryCount')::int<>1005 or (result->>'quoteCount')::int<>1005 then raise exception 'Monthly recap mismatch: %',result; end if;
  if public.get_monthly_recap('2026-09-06') is not null then raise exception 'Recap shown outside first day'; end if;
  result := public.get_recall_entry('2026-09-06');
  if result->>'id'<>'00000000-0000-4000-8000-000000000020' or (result->>'yearsAgo')::int<>1 then raise exception 'Anniversary selection mismatch'; end if;
  if public.get_recall_entry('2026-09-07') is distinct from public.get_recall_entry('2026-09-07') then raise exception 'Recall nondeterministic'; end if;
  -- JS seededIndex(1006, '00000000-0000-4000-8000-000000000001|2026-09-07') = 107.
  if public.get_recall_entry('2026-09-07')->>'quote'<>'Private 107' then raise exception 'Recall differs from JS seed/order'; end if;
  result := public.get_social_feed(0,1);
  if jsonb_array_length(result)<>1 or result->0->'entry'->>'quote'<>'Friend public'
    or (result->0->>'initialLikeCount')::int<>1 or (result->0->>'initialCommentCount')::int<>1
    or not (result->0->>'initialLiked')::boolean then raise exception 'Feed counts/privacy mismatch'; end if;
  if public.get_social_feed(1,1)<>'[]'::jsonb then raise exception 'Feed pagination or privacy mismatch'; end if;
  result := public.get_reading_stats('00000000-0000-4000-8000-000000000002');
  if (result->>'totalEntries')::int<>1 then raise exception 'Friend private stats leaked'; end if;
end $$;

update public.user_books set is_finished=true where user_id=(select auth.uid());
do $$ declare result jsonb; begin
  result := public.get_books_page();
  if jsonb_array_length(result->'books')<>1 or (result->'stats'->'00000000-0000-4000-8000-000000000011'->>'entryCount')::int<>1007 then raise exception 'Books page mismatch'; end if;
  result := public.get_profile_retrospect('00000000-0000-4000-8000-000000000001','2026-09-06');
  if jsonb_array_length(result->'monthly')<>6 or (result->'monthly'->1->>'count')::int<>1005
    or jsonb_array_length(result->'monthly'->1->'quotes')<>3
    or (result->'finishedBooks'->0->>'quoteCount')::int<>1006 then raise exception 'Profile summary unbounded/truncated'; end if;
  result := public.get_featured_bookmark('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001');
  if (result->>'quoteCount')::int<>1006 or jsonb_array_length(result->'quotes')<>3 then raise exception 'Bookmark counts/previews mismatch'; end if;
  if public.get_featured_bookmark('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000002') is not null then raise exception 'Wrong bookmark owner accepted'; end if;
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',false);
do $$ declare result jsonb; begin
  -- Even a caller explicitly passing public_only=false cannot bypass RLS.
  result := public.get_profile_retrospect('00000000-0000-4000-8000-000000000001','2026-09-06',false);
  if result->'finishedBooks'<>'[]'::jsonb or (result->'monthly'->1->>'count')::int<>0 then raise exception 'Friend private profile summary leaked'; end if;
  result := public.get_featured_bookmark('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001',false);
  if (result->>'quoteCount')::int<>0 or result->'quotes'<>'[]'::jsonb then raise exception 'Friend private bookmark leaked'; end if;
end $$;

-- Stranger: no feed or books/entries from another account; no forged user argument bypasses RLS.
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}',false);
do $$ begin
  if public.get_social_feed()<>'[]'::jsonb then raise exception 'Stranger feed leaked'; end if;
  if (public.get_reading_stats('00000000-0000-4000-8000-000000000001')->>'totalEntries')::int<>0 then raise exception 'Stranger stats leaked'; end if;
  if public.get_book_reading_stats()<>'{}'::jsonb then raise exception 'Stranger book stats leaked'; end if;
  if public.get_recall_entry('2026-09-06') is not null then raise exception 'Stranger recall leaked'; end if;
  if public.get_dashboard_core('2026-09-06')->'books'<>'[]'::jsonb then raise exception 'Stranger dashboard leaked'; end if;
  if public.get_books_page()->'books'<>'[]'::jsonb then raise exception 'Stranger bookshelf leaked'; end if;
  if public.get_featured_bookmark('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001') is not null then raise exception 'Stranger bookmark leaked'; end if;
end $$;

reset role;
do $$ declare f record; begin
  for f in select oid from pg_proc where proname in ('get_dashboard_core','get_reading_stats','get_book_reading_stats','get_social_feed','get_monthly_recap','get_recall_entry','get_books_page','get_profile_retrospect','get_featured_bookmark') loop
    if has_function_privilege('anon',f.oid,'EXECUTE') then raise exception 'Anonymous RPC execution allowed'; end if;
    if (select prosecdef from pg_proc where oid=f.oid) then raise exception 'RPC bypasses RLS'; end if;
  end loop;
end $$;

-- ECMAScript trim parity: NBSP/BOM-only quote + a real note must not count as a quote.
insert into public.entries(user_book_id,date,quote,note,is_private) values
('00000000-0000-4000-8000-000000000011','2026-08-11',chr(160)||chr(65279),'A real note',true);
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',false);
do $$ declare result jsonb; begin
  result := public.get_monthly_recap('2026-09-01');
  if (result->>'entryCount')::int<>1006 or (result->>'quoteCount')::int<>1005 then raise exception 'Unicode whitespace counted as quote'; end if;
  result := public.get_profile_retrospect('00000000-0000-4000-8000-000000000001','2026-09-06');
  if (result->'finishedBooks'->0->>'quoteCount')::int<>1006 then raise exception 'Profile Unicode whitespace mismatch'; end if;
  result := public.get_featured_bookmark('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001');
  if (result->>'quoteCount')::int<>1006 then raise exception 'Bookmark Unicode whitespace mismatch'; end if;
end $$;
reset role;
