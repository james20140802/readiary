insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
insert into books(id,title,author) values ('10000000-0000-0000-0000-000000000001','기다림 책','Author'), ('10000000-0000-0000-0000-000000000002','기록 없는 책','Other');
insert into user_books(id,user_id,book_id) values
 ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002');
insert into entries(user_book_id,date,quote,note,is_private)
 select '20000000-0000-0000-0000-000000000001', '2026-09-15', '기다림 '||n, null, true from generate_series(1,25) n;
insert into entries(user_book_id,date,quote,note) values
 ('20000000-0000-0000-0000-000000000001','2026-09-01',null,'100%_* 생각'),
 ('20000000-0000-0000-0000-000000000001','2026-09-02','앞 '||repeat('긴 문장 ',150)||'기다림 뒤','기다림 생각'),
 ('20000000-0000-0000-0000-000000000002','2026-09-15','다른 계정 기다림',null);
-- Broad friend-readable policies intentionally allow the other account through RLS;
-- search must still enforce the stricter owner-only boundary.
alter table user_books enable row level security;
alter table entries enable row level security;
create policy test_friend_books on user_books for select to authenticated using (true);
create policy test_friend_entries on entries for select to authenticated using (true);
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001"}',false);
do $$ declare a jsonb; b jsonb; begin
 a := public.search_library('기다림','entries');
 assert jsonb_array_length(a->'items')=20, 'page limit';
 b := public.search_library('기다림','entries',p_cursor=>a->'next');
 assert jsonb_array_length(b->'items')=6, 'next page contains all own records only';
 assert b->'next'='null'::jsonb, 'last cursor';
 assert not exists(select 1 from jsonb_array_elements(a->'items') x join jsonb_array_elements(b->'items') y on x->>'id'=y->>'id'), 'no duplicates with tied dates';
 a := public.search_library('100%_*','entries');
 assert jsonb_array_length(a->'items')=1 and a->'items'->0->>'quote' is null, 'literal note-only match';
 assert jsonb_array_length(public.search_library('Author','books')->'items')=1, 'author search';
 assert jsonb_array_length(public.search_library('기록 없는','books')->'items')=1, 'book without entries';
 assert jsonb_array_length(public.search_library('','candidates')->'items')=2, 'owned candidate list';
 assert jsonb_array_length(public.search_library('기다림','entries',p_book_id=>'20000000-0000-0000-0000-000000000002')->'items')=0, 'foreign book filter';
 a := public.search_library('기다림','entries',p_from=>'2026-09-02',p_to=>'2026-09-02');
 assert jsonb_array_length(a->'items')=1, 'inclusive date range';
 assert length(a->'items'->0->>'quote')<400 and strpos(a->'items'->0->>'quote','기다림')>0, 'bounded contextual excerpt';
 assert a->'items'->0->>'note' is not null, 'both matching fields, one record';
 assert not has_function_privilege('anon','public.search_excerpt(text,text)','execute'), 'anonymous excerpt denied';
 assert has_function_privilege('authenticated','public.search_excerpt(text,text)','execute'), 'authenticated excerpt allowed';
 assert public.search_excerpt('HELLO','hello')='HELLO', 'case insensitive';
 assert not has_function_privilege('anon','public.search_library(text,text,uuid,date,date,jsonb)','execute'), 'anonymous denied';
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000002"}',false);
do $$ begin
 assert jsonb_array_length(public.search_library('기다림','entries')->'items')=1, 'account switch isolates results';
end $$;
reset role;
