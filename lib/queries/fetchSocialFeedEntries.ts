'use server';

import { fetchReflectionSummaries } from '@/lib/reflections/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { DetailSocialFeedEntry } from '@/types/entry';

export async function fetchDetailSocialFeedEntries(
  page = 0,
  limit = 10
): Promise<DetailSocialFeedEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_social_feed', { p_page: page, p_limit: limit });
  if (error) throw new Error('친구들의 기록을 불러오지 못했습니다.');
  const entries = (data ?? []) as unknown as DetailSocialFeedEntry[];
  const summaries = await fetchReflectionSummaries(entries.map((item) => item.entry.id));
  return entries.map((item) => ({
    ...item,
    entry: { ...item.entry, reflectionSummary: summaries?.[item.entry.id] ?? null },
  }));
}
