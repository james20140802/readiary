import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** 서버 전용: 탈퇴 처리에 쓰는 service role 클라이언트. 클라이언트 컴포넌트에서 가져오지 않는다. */
export function accountAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') throw new Error('Server only');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Account storage unavailable');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
