-- 사진에서 문장 옮기기: 사진 글자 읽기 동의와 하루 한도.
-- 사진과 읽은 글은 어디에도 저장하지 않는다. 여기 남는 것은 동의(시각·문구 판·철회 시각)와 하루 사용 횟수뿐이다.
-- 동의는 본인만 읽고, 쓰기는 아래 RPC로만 한다. 횟수는 클라이언트가 읽지도 쓰지도 못한다.
begin;

create table public.photo_text_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- 동의 시트 문구의 판 번호. 문구가 바뀌면 번호를 올려 다시 묻는다.
  copy_version integer not null check (copy_version > 0),
  consented_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create table public.photo_text_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 한국 날짜. 자정에 초기화된다.
  day date not null,
  count integer not null check (count between 1 and 30),
  primary key (user_id, day)
);

alter table public.photo_text_consents enable row level security;
alter table public.photo_text_usage enable row level security;
revoke all on public.photo_text_consents, public.photo_text_usage from anon, authenticated;
grant select on public.photo_text_consents to authenticated;
create policy photo_text_consents_owner on public.photo_text_consents
  for select to authenticated using (user_id = (select auth.uid()));
grant all on public.photo_text_consents, public.photo_text_usage to service_role;

-- 이 판의 문구에 동의했고 철회하지 않았는지.
create function public.photo_text_consented(p_version integer)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.photo_text_consents c
    where c.user_id = (select auth.uid()) and c.copy_version = p_version and c.withdrawn_at is null
  );
$$;

-- 동의를 남긴다. 철회했던 사람이 다시 동의하면 철회 시각을 지운다.
create function public.set_photo_text_consent(p_version integer)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
begin
  perform public.assert_account_active();
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_version is null or p_version < 1 then raise exception 'invalid_version'; end if;

  insert into public.photo_text_consents as c (user_id, copy_version, consented_at, withdrawn_at)
  values (v_user, p_version, now(), null)
  on conflict (user_id) do update
    set copy_version = excluded.copy_version, consented_at = excluded.consented_at, withdrawn_at = null;
end;
$$;

-- 철회는 언제나 할 수 있다(탈퇴를 신청한 계정도).
create function public.withdraw_photo_text_consent()
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  update public.photo_text_consents set withdrawn_at = now()
  where user_id = v_user and withdrawn_at is null;
end;
$$;

-- 사진 한 장을 읽기 전에 부른다. 동의 확인과 횟수 올리기를 한 번에 해서, 동시에 여러 요청을 보내도 30장을 넘지 못한다.
-- 'ok' | 'consent_required' | 'daily_limit'. 읽기에 실패해도 횟수는 되돌리지 않는다.
create function public.begin_photo_text_read(p_version integer)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_count integer;
begin
  if v_user is null then return 'consent_required'; end if;
  perform public.assert_account_active();
  if not public.photo_text_consented(p_version) then return 'consent_required'; end if;

  delete from public.photo_text_usage where user_id = v_user and day < v_today;

  insert into public.photo_text_usage as u (user_id, day, count)
  values (v_user, v_today, 1)
  on conflict (user_id, day) do update set count = u.count + 1 where u.count < 30
  returning u.count into v_count;

  if v_count is null then return 'daily_limit'; end if;
  return 'ok';
end;
$$;

revoke all on function public.photo_text_consented(integer), public.set_photo_text_consent(integer),
  public.withdraw_photo_text_consent(), public.begin_photo_text_read(integer) from public, anon;
grant execute on function public.photo_text_consented(integer), public.set_photo_text_consent(integer),
  public.withdraw_photo_text_consent(), public.begin_photo_text_read(integer) to authenticated;

commit;
