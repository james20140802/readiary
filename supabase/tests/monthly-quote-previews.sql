-- Reuses performance_contract.sql fixtures, including >1000 private records.
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',false);
do $$ declare result jsonb; month jsonb; preview jsonb; begin
  result := public.get_profile_retrospect('00000000-0000-4000-8000-000000000001','2026-09-06');
  if jsonb_array_length(result->'monthly') <> 6 then raise exception 'Month bound changed'; end if;
  month := result->'monthly'->1;
  if jsonb_array_length(month->'quotePreviews') <> 3 then raise exception 'Preview bound changed'; end if;
  if (select jsonb_agg(q->'quote') from jsonb_array_elements(month->'quotePreviews') q) <> month->'quotes' then raise exception 'Quote order or compatibility changed'; end if;
  for preview in select * from jsonb_array_elements(month->'quotePreviews') loop
    if not exists(select 1 from public.entries e where e.id=(preview->>'entryId')::uuid and e.quote=preview->>'quote') then raise exception 'Quote ID mismatch'; end if;
  end loop;
  result := public.get_profile_retrospect('00000000-0000-4000-8000-000000000002','2026-09-06',false);
  if result->'monthly'->0->'quotePreviews' <> '[{"entryId":"00000000-0000-4000-8000-000000000022","quote":"Friend public"}]'::jsonb then raise exception 'Friend preview privacy mismatch'; end if;
  if result->'monthly'->1->'quotePreviews' <> '[]'::jsonb then raise exception 'Empty month mismatch'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}',false);
do $$ declare result jsonb; begin
 result := public.get_profile_retrospect('00000000-0000-4000-8000-000000000001','2026-09-06');
 if exists(select 1 from jsonb_array_elements(result->'monthly') m where m->'quotePreviews'<>'[]'::jsonb) then raise exception 'Nonfriend preview leaked'; end if;
end $$;
reset role;
