import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { unauthorized } from '@/lib/api/auth';
import { NextResponse } from 'next/server';
import type { ReflectionSummary } from './types';
import { uuidPattern } from './types';
export const reflectionHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  Vary: 'Cookie',
};
export function reflectionError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: reflectionHeaders });
}
export async function reflectionAccess(entryId: string, write = false) {
  const {
    data: { user },
    error,
  } = await getServerUser();
  if (!user || error) return { response: unauthorized(reflectionHeaders) };
  if (!uuidPattern.test(entryId))
    return { response: reflectionError('기록을 볼 수 없습니다.', 404) };
  const supabase = await createSupabaseServerClient();
  const { data: entry, error: readError } = await supabase
    .from('entries')
    .select('id,is_private,user_books!inner(user_id)')
    .eq('id', entryId)
    .maybeSingle();
  if (readError) return { response: reflectionError('기록을 불러오지 못했습니다.', 500) };
  if (!entry) return { response: reflectionError('기록을 볼 수 없습니다.', 404) };
  const canWrite = entry.user_books.user_id === user.id;
  if (write && !canWrite)
    return { response: reflectionError('내 기록에만 생각을 남길 수 있습니다.', 403) };
  // Entry RLS is authoritative; also fail closed here if a legacy policy drifts.
  if (!canWrite) {
    if (entry.is_private) return { response: reflectionError('기록을 볼 수 없습니다.', 404) };
    const owner = entry.user_books.user_id;
    const { data: friend, error: friendError } = await supabase
      .from('friends')
      .select('id')
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${owner}),and(user_id.eq.${owner},friend_id.eq.${user.id})`
      )
      .eq('status', 'accepted')
      .limit(1)
      .maybeSingle();
    if (friendError) return { response: reflectionError('기록을 불러오지 못했습니다.', 500) };
    if (!friend) return { response: reflectionError('기록을 볼 수 없습니다.', 404) };
  }
  return { supabase, user, entry, canWrite };
}
export async function fetchReflectionSummaries(
  ids: string[]
): Promise<Record<string, ReflectionSummary> | null> {
  const result: Record<string, ReflectionSummary> = {};
  if (!ids.length) return result;
  const supabase = await createSupabaseServerClient();
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase.rpc('get_entry_reflection_summaries', {
      p_entry_ids: ids.slice(i, i + 100),
    });
    if (error) return null;
    for (const row of data ?? [])
      result[row.entry_id] = {
        total: Number(row.total),
        latest: row.latest as ReflectionSummary['latest'],
      };
  }
  return result;
}
