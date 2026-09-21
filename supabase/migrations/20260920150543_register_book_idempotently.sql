-- Durable results survive book removal: replay must never create a second registration.
create table public.book_registration_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  payload jsonb not null,
  book_id uuid not null,
  user_book_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);
alter table public.book_registration_requests enable row level security;
revoke all on public.book_registration_requests from public, anon, authenticated;
grant select, insert on public.book_registration_requests to authenticated;
create policy book_registration_requests_select_own on public.book_registration_requests
  for select to authenticated using (user_id = (select auth.uid()));
create policy book_registration_requests_insert_own on public.book_registration_requests
  for insert to authenticated with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.user_books ub
      where ub.id = book_registration_requests.user_book_id and ub.book_id = book_registration_requests.book_id and ub.user_id = (select auth.uid())
    )
  );

create function public.register_book_idempotently(
  p_request_id uuid, p_title text, p_author text,
  p_total_pages integer default null, p_isbn text default null, p_cover_url text default null
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_payload jsonb;
  v_existing public.book_registration_requests%rowtype;
  v_book uuid;
  v_user_book uuid;
begin
  if v_user is null then raise insufficient_privilege using message = 'Authentication required'; end if;
  if p_request_id is null or nullif(btrim(p_title), '') is null or nullif(btrim(p_author), '') is null then
    raise invalid_parameter_value using message = 'Title, author and request ID required';
  end if;
  if p_total_pages is not null and p_total_pages <= 0 then
    raise invalid_parameter_value using message = 'Total pages must be positive';
  end if;
  p_title := btrim(p_title);
  p_author := btrim(p_author);
  p_isbn := nullif(btrim(p_isbn), '');
  p_cover_url := nullif(btrim(p_cover_url), '');
  v_payload := jsonb_build_object('title', p_title, 'author', p_author,
    'total_pages', p_total_pages, 'isbn', p_isbn, 'cover_url', p_cover_url);
  -- Transaction-scoped serialization: concurrent retries see the committed immutable result.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_request_id::text, 0));
  select * into v_existing from public.book_registration_requests
    where user_id = v_user and request_id = p_request_id;
  if found then
    if v_existing.payload <> v_payload then
      raise sqlstate 'PT409' using message = 'Request ID already used with different content';
    end if;
    return jsonb_build_object('book_id', v_existing.book_id, 'user_book_id', v_existing.user_book_id, 'replayed', true);
  end if;
  insert into public.books(title, author, total_pages, isbn, cover_url)
    values (p_title, p_author, p_total_pages, p_isbn, p_cover_url)
    on conflict (isbn) do nothing returning id into v_book;
  if v_book is null then
    select id into strict v_book from public.books where isbn = p_isbn;
  end if;
  insert into public.user_books(user_id, book_id) values (v_user, v_book) returning id into v_user_book;
  insert into public.book_registration_requests(user_id, request_id, payload, book_id, user_book_id)
    values (v_user, p_request_id, v_payload, v_book, v_user_book);
  return jsonb_build_object('book_id', v_book, 'user_book_id', v_user_book, 'replayed', false);
end;
$$;
revoke all on function public.register_book_idempotently(uuid,text,text,integer,text,text) from public, anon;
grant execute on function public.register_book_idempotently(uuid,text,text,integer,text,text) to authenticated;
