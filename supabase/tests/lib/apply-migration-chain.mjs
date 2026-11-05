// 빈 메모리 DB에 Supabase가 제공하는 것만 최소로 스텁하고, supabase/migrations/*.sql 전체를 파일명 순서로 적용한다.
// 새 마이그레이션 파일도 자동으로 포함된다. 적용한 파일 이름 목록을 돌려준다.
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);

export async function applyMigrationChain(db) {
  // 1) Supabase가 제공하는 것만 최소로 스텁한다.
  await db.exec(`
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
    -- Supabase 기본값: public에 새로 만든 함수는 세 역할이 실행할 수 있다(테이블과 달리 그대로다).
    -- 이걸 모델링해야 마이그레이션이 anon 회수를 빠뜨렸을 때 계약 테스트가 실패한다.
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  `);

  // 2) 저장소 마이그레이션 전체를 파일명 순서로 적용한다.
  const files = (await readdir(new URL('migrations/', root)))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    try {
      await db.exec(await readFile(new URL(`migrations/${file}`, root), 'utf8'));
    } catch (error) {
      throw new Error(
        `migration ${file} failed to apply on an empty database: ${error.message} ${error.code ?? ''} ${error.where ?? ''}`
      );
    }
  }

  return files;
}
