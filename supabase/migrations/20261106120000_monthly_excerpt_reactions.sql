-- 달의 발췌집 좋아요·댓글·알림. 반응은 한 권에 붙는다. 문장을 고치거나 일부가 빠져도 유지되고,
-- 친구에게 보이지 않는 동안(나만 보기, 공개 문장 없음, 친구 해제)에는 그 친구에게 숨겨지며 새로 남길 수 없다.
-- 다시 보이면 돌아오고, 지우는 것은 권을 삭제할 때뿐이다. 볼 수 있는지는 can_view_monthly_excerpt 한 곳에서 정한다.
-- 새 테이블·열·함수를 더하고 알림 종류를 넓히기만 하므로 옛 코드가 돌아가는 동안 먼저 적용해도 안전하다.
begin;

create table public.monthly_excerpt_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  excerpt_id uuid not null references public.monthly_excerpts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, excerpt_id)
);
create index monthly_excerpt_likes_excerpt_id_idx on public.monthly_excerpt_likes (excerpt_id);

-- comments와 같은 제약이다. 답글의 부모는 같은 권의 댓글이어야 하므로 (parent_id, excerpt_id)로 묶는다.
-- 부모가 없는 댓글은 parent_id가 null이라 이 외래 키 검사를 받지 않는다.
-- client_comment_id는 작성 재시도의 멱등 키다. 재시도는 사용자별로 같은 값이면 같은 댓글이다.
create table public.monthly_excerpt_comments (
  id uuid primary key default gen_random_uuid(),
  excerpt_id uuid not null references public.monthly_excerpts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  parent_id uuid,
  client_comment_id uuid,
  created_at timestamptz not null default now(),
  unique (id, excerpt_id),
  unique (user_id, client_comment_id),
  foreign key (parent_id, excerpt_id)
    references public.monthly_excerpt_comments (id, excerpt_id) on delete cascade
);
create index monthly_excerpt_comments_excerpt_id_idx on public.monthly_excerpt_comments (excerpt_id, created_at);
create index monthly_excerpt_comments_parent_id_idx on public.monthly_excerpt_comments (parent_id);

alter table public.monthly_excerpt_likes enable row level security;
alter table public.monthly_excerpt_comments enable row level security;

-- 반응은 고치지 않으므로 update를 주지 않는다.
revoke all on public.monthly_excerpt_likes from public, anon, authenticated;
revoke all on public.monthly_excerpt_comments from public, anon, authenticated;
grant select, insert, delete on public.monthly_excerpt_likes to authenticated;
grant select, insert, delete on public.monthly_excerpt_comments to authenticated;
grant all on public.monthly_excerpt_likes to service_role;
grant all on public.monthly_excerpt_comments to service_role;

-- 읽기: 볼 수 있는 권의 반응만. can_view는 소유자에게 늘 참이라, 숨겨진 동안에도 소유자는 읽는다.
create policy "monthly_excerpt_likes_select_viewable" on public.monthly_excerpt_likes
  for select to authenticated
  using (public.can_view_monthly_excerpt(excerpt_id));

create policy "monthly_excerpt_likes_insert_own" on public.monthly_excerpt_likes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_monthly_excerpt(excerpt_id));

-- 지우기: 본인 것만. 숨겨진 동안에는 자기 반응도 지우지 못해 다시 보이면 그대로 돌아온다.
create policy "monthly_excerpt_likes_delete_own" on public.monthly_excerpt_likes
  for delete to authenticated
  using (user_id = (select auth.uid()) and public.can_view_monthly_excerpt(excerpt_id));

create policy "monthly_excerpt_comments_select_viewable" on public.monthly_excerpt_comments
  for select to authenticated
  using (public.can_view_monthly_excerpt(excerpt_id));

create policy "monthly_excerpt_comments_insert_own" on public.monthly_excerpt_comments
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_monthly_excerpt(excerpt_id));

create policy "monthly_excerpt_comments_delete_own" on public.monthly_excerpt_comments
  for delete to authenticated
  using (user_id = (select auth.uid()) and public.can_view_monthly_excerpt(excerpt_id));

-- ── 알림 ─────────────────────────────────────────────────────
-- monthly_excerpt_id: 권이 지워지면 알림도 사라진다.
-- monthly_excerpt_comment_id: comment_id와 같은 역할이다. comment_id는 comments만 가리키므로 따로 둔다.
alter table public.notifications
  add column monthly_excerpt_id uuid references public.monthly_excerpts (id) on delete cascade,
  add column monthly_excerpt_comment_id uuid references public.monthly_excerpt_comments (id) on delete cascade;

-- 이름은 그대로 두고 종류만 넓힌다. 기존 값은 모두 새 목록에 있어 옛 코드의 쓰기는 그대로 통과한다.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in ('friend_request', 'friend_accept', 'like', 'comment', 'excerpt_like', 'excerpt_comment')
);

-- 토글 스팸과 동시 호출은 notifications_like_event_unique와 같은 부분 유니크 인덱스로 막는다.
create unique index notifications_excerpt_like_event_unique
  on public.notifications (monthly_excerpt_id, actor_id)
  where type = 'excerpt_like';
-- 댓글 재시도에도 알림은 댓글당 하나다.
create unique index notifications_monthly_excerpt_comment_id_unique
  on public.notifications (monthly_excerpt_comment_id)
  where monthly_excerpt_comment_id is not null;
-- 권 삭제의 cascade가 댓글 알림까지 빠르게 찾도록 둔다.
create index notifications_monthly_excerpt_id_idx
  on public.notifications (monthly_excerpt_id)
  where monthly_excerpt_id is not null;

-- notify_entry_event와 같은 검증. 수신자는 권에서 직접 해석하므로 위조할 수 없고, 실제 반응 행이 있어야 한다.
-- 볼 수 없는 권에는 알림을 만들지 않는다. 옛 친구가 남은 반응으로 알림을 되살리지 못한다.
create or replace function public.notify_monthly_excerpt_event(
  p_excerpt_id uuid,
  p_type text,
  p_comment_id uuid default null
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_recipient uuid;
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;
  if p_type is null or p_type not in ('excerpt_like', 'excerpt_comment') then
    raise exception 'invalid notification type: %', p_type;
  end if;
  if p_comment_id is not null and p_type <> 'excerpt_comment' then
    raise exception 'p_comment_id is only valid for comment notifications';
  end if;

  select x.user_id into v_recipient from public.monthly_excerpts x where x.id = p_excerpt_id;

  -- 권이 없거나 내 권이면 조용히 끝낸다.
  if v_recipient is null or v_recipient = v_actor then
    return;
  end if;
  if not public.can_view_monthly_excerpt(p_excerpt_id) then
    return;
  end if;

  if p_type = 'excerpt_like' then
    if not exists (
      select 1 from public.monthly_excerpt_likes l
      where l.excerpt_id = p_excerpt_id and l.user_id = v_actor
    ) then
      return;
    end if;
    insert into public.notifications (user_id, actor_id, type, monthly_excerpt_id)
    values (v_recipient, v_actor, 'excerpt_like', p_excerpt_id)
    on conflict (monthly_excerpt_id, actor_id) where type = 'excerpt_like' do nothing;
    return;
  end if;

  -- 댓글: 이 권에 내가 남긴 댓글이어야 한다. 알림은 댓글에 매달려 댓글을 지우면 함께 사라진다.
  if p_comment_id is null or not exists (
    select 1 from public.monthly_excerpt_comments c
    where c.id = p_comment_id and c.excerpt_id = p_excerpt_id and c.user_id = v_actor
  ) then
    return;
  end if;
  insert into public.notifications (user_id, actor_id, type, monthly_excerpt_id, monthly_excerpt_comment_id)
  values (v_recipient, v_actor, 'excerpt_comment', p_excerpt_id, p_comment_id)
  on conflict (monthly_excerpt_comment_id) where monthly_excerpt_comment_id is not null do nothing;
end;
$$;
revoke all on function public.notify_monthly_excerpt_event(uuid, text, uuid) from public, anon;
grant execute on function public.notify_monthly_excerpt_event(uuid, text, uuid) to authenticated;

-- 좋아요를 곧바로 취소했을 때 안 읽은 알림을 거둔다. retract_like_notification과 같은 조건이다.
create or replace function public.retract_monthly_excerpt_like_notification(p_excerpt_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;
  delete from public.notifications n
  where n.monthly_excerpt_id = p_excerpt_id
    and n.actor_id = v_actor
    and n.type = 'excerpt_like'
    and n.read_at is null
    and n.created_at > now() - interval '10 minutes'
    and not exists (
      select 1 from public.monthly_excerpt_likes l
      where l.excerpt_id = p_excerpt_id and l.user_id = v_actor
    );
end;
$$;
revoke all on function public.retract_monthly_excerpt_like_notification(uuid) from public, anon;
grant execute on function public.retract_monthly_excerpt_like_notification(uuid) to authenticated;

-- 읽는 화면의 첫 수. 볼 수 없는 권은 null이다. 신원은 auth.uid()뿐이다.
create or replace function public.get_monthly_excerpt_reactions(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_view_monthly_excerpt(p_id) then
    return null;
  end if;
  return jsonb_build_object(
    'likeCount', (select count(*)::integer from public.monthly_excerpt_likes l where l.excerpt_id = p_id),
    'commentCount', (select count(*)::integer from public.monthly_excerpt_comments c where c.excerpt_id = p_id),
    'liked', exists (
      select 1 from public.monthly_excerpt_likes l
      where l.excerpt_id = p_id and l.user_id = (select auth.uid())
    )
  );
end;
$$;
revoke all on function public.get_monthly_excerpt_reactions(uuid) from public, anon;
grant execute on function public.get_monthly_excerpt_reactions(uuid) to authenticated;

commit;
