-- Minimal local schema from read-only information_schema / pg_policies inspection on 2026-09-06.
-- Run ONLY via run-privacy-contract.mjs in an empty in-memory database.
create role anon;
create role authenticated;
create schema auth;
create schema storage;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1]
$$;
create table public.books(id uuid primary key default gen_random_uuid(), title text not null, author text, isbn text, total_pages integer, cover_url text);
create table public.profiles(id uuid primary key references auth.users on delete cascade, name text not null, nickname text not null, tag text not null, bio text, profile_image text, created_at timestamptz default now(), featured_entry_id uuid, bookmark_user_book_id uuid);
create table public.user_books(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, book_id uuid not null references books, is_finished boolean default false, last_read_page integer default 0, started_at date, created_at timestamptz default now(), progress integer default 0, finished_at timestamptz);
create table public.entries(id uuid primary key default gen_random_uuid(), user_book_id uuid not null references user_books on delete cascade, date date not null, from_page integer, to_page integer, note text, created_at timestamptz default now(), is_private boolean not null default false, quote text);
create table public.friends(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, friend_id uuid not null references profiles on delete cascade, status text not null, requested_at timestamptz default now(), accepted_at timestamptz);
create table public.comments(id uuid primary key default gen_random_uuid(), entry_id uuid not null references entries on delete cascade, user_id uuid not null references profiles on delete cascade, content text not null, parent_id uuid references comments on delete cascade, created_at timestamptz not null default now());
create table public.likes(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, entry_id uuid not null references entries on delete cascade, created_at timestamptz default now());
create table public.notifications(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, actor_id uuid not null references profiles on delete cascade, type text not null, entry_id uuid references entries on delete cascade, read_at timestamptz, created_at timestamptz not null default now(), comment_id uuid references comments on delete cascade, friendship_id uuid references friends on delete cascade);
alter table public.profiles add foreign key (featured_entry_id) references entries on delete set null;
alter table public.profiles add foreign key (bookmark_user_book_id) references user_books on delete set null;
create table storage.buckets(id text primary key, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets, name text not null, metadata jsonb);
insert into storage.buckets values ('profiles', true, 5242880, array['image/jpeg','image/png','image/webp']);
alter table storage.objects enable row level security;
-- Representative legacy policies: unrestricted member writes and anonymous reads.
create policy "INSERT 1ige2ga_0" on storage.objects for insert to authenticated with check(bucket_id='profiles');
create policy "UPDATE 1ige2ga_0" on storage.objects for delete to authenticated using(bucket_id='profiles');
create policy "UPDATE 1ige2ga_2" on storage.objects for update to authenticated using(bucket_id='profiles');
create policy "누구나 프로필 사진 조회 가능" on storage.objects for select to public using(bucket_id='profiles');
grant usage on schema public, auth, storage to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.objects to anon;
