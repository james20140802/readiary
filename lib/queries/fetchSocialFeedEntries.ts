'use server';

import { fetchReflectionSummaries } from '@/lib/reflections/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SocialFeedEntryItem, SocialFeedItem } from '@/types/entry';

/** 친구 피드 한 쪽. 기록과 달의 발췌집이 시각순으로 섞여 온다. 덧붙인 생각 요약은 기록에만 붙는다 */
export async function fetchSocialFeedItems(page = 0, limit = 10): Promise<SocialFeedItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_social_feed_items', {
    p_page: page,
    p_limit: limit,
  });
  if (error) throw new Error('친구들의 기록을 불러오지 못했습니다.');
  const items = (data ?? []) as unknown as SocialFeedItem[];
  const entryIds = items
    .filter((item): item is SocialFeedEntryItem => item.kind === 'entry')
    .map((item) => item.entry.id);
  const summaries = await fetchReflectionSummaries(entryIds);
  return items.map((item) =>
    item.kind === 'entry'
      ? {
          ...item,
          entry: { ...item.entry, reflectionSummary: summaries?.[item.entry.id] ?? null },
        }
      : item
  );
}
