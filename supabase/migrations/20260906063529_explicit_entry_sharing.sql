-- A friend-visible entry is not automatically a public link.
-- Old links must be re-enabled by their owner: previous share-button clicks were not recorded.
begin;
alter table public.entries add column shared_at timestamptz;

create or replace function public.enable_entry_share(p_entry_id uuid)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if (select auth.uid()) is null then return false; end if;
  update public.entries e set shared_at = coalesce(e.shared_at, now())
  where e.id = p_entry_id and e.is_private = false
    and exists (select 1 from public.user_books ub
      where ub.id = e.user_book_id and ub.user_id = (select auth.uid()));
  return found;
end;
$$;
revoke all on function public.enable_entry_share(uuid) from public, anon;
grant execute on function public.enable_entry_share(uuid) to authenticated;

-- Returning an entry to friend visibility must not silently revive an old public link.
create or replace function public.clear_private_entry_share()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if new.is_private then new.shared_at := null; end if;
  return new;
end;
$$;
revoke all on function public.clear_private_entry_share() from public, anon, authenticated;
create trigger entries_clear_private_share before insert or update on public.entries
for each row execute function public.clear_private_entry_share();

create or replace function public.get_public_entry(p_entry_id uuid)
returns table (id uuid, quote text, note text, date date, book_title text, book_author text, nickname text)
language sql security definer set search_path = public, pg_temp stable as $$
  select e.id, e.quote, e.note, e.date, b.title, b.author, p.nickname
  from public.entries e
  join public.user_books ub on ub.id = e.user_book_id
  join public.books b on b.id = ub.book_id
  join public.profiles p on p.id = ub.user_id
  where e.id = p_entry_id and e.is_private = false and e.shared_at is not null;
$$;
revoke all on function public.get_public_entry(uuid) from public;
grant execute on function public.get_public_entry(uuid) to anon, authenticated;
commit;
