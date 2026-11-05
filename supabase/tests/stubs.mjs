// Supabase가 제공하는 것만 최소로 스텁한다(역할 3개, auth.users/auth.uid(), storage 버킷·정책에
// 필요한 만큼의 storage 스키마). pg_cron·pg_net 등 저장소 마이그레이션이 쓰지 않는 확장은 스텁하지 않는다.
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const migrationsDir = new URL('../migrations/', import.meta.url);

// PGLITE_MODULE이 있으면 그 경로(상대 경로 포함)에서, 없으면 devDependency에서 불러온다.
export async function loadPGlite() {
  const modulePath = process.env.PGLITE_MODULE;
  const specifier = modulePath ? pathToFileURL(resolve(modulePath)).href : '@electric-sql/pglite';
  const { PGlite } = await import(specifier);
  return PGlite;
}

export const SUPABASE_STUBS_SQL = `
  create role anon;
  create role authenticated;
  create role service_role bypassrls;
  create schema auth;
  create schema storage;
  create table auth.users (
    id uuid primary key,
    email text,
    email_confirmed_at timestamptz
  );
  create function auth.uid() returns uuid language sql stable as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
  $$;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1]
  $$;
  create table storage.buckets (
    id text primary key, public boolean, file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets,
    name text not null,
    metadata jsonb,
    owner uuid
  );
  insert into storage.buckets values ('profiles', true, 5242880, array['image/jpeg','image/png','image/webp']);
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage to anon, authenticated;
  -- 2026-10-30 이후 기본값: public에 새로 만든 객체에 역할 권한을 자동으로 주지 않는다.
  alter default privileges in schema public revoke all on tables from anon, authenticated;
`;

// 저장소 마이그레이션 전체를 파일명 순서로 적용하고, 적용한 파일 목록을 돌려준다.
export async function applyAllMigrations(db) {
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    try {
      await db.exec(await readFile(new URL(file, migrationsDir), 'utf8'));
    } catch (error) {
      throw new Error(
        `migration ${file} failed to apply on an empty database: ${error.message} ${error.code ?? ''} ${error.where ?? ''}`
      );
    }
  }
  return files;
}
