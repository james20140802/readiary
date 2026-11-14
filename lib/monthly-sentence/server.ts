import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSentenceRule, SENTENCE_PAGE_SIZE } from './model';
import type { FriendSentences, OwnSentences, SentenceRuleSetting } from './types';

// 불러오지 못한 것은 throw로 알려 "문장이 없음"과 섞이지 않게 한다. 로그에는 오류 코드만 남긴다.
function fail(label: string, error: { code?: string }): never {
  console.error(`${label}:`, error.code);
  throw new Error(label);
}

async function fetchSentences(ownerId: string): Promise<{ mode?: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_monthly_sentences', {
    p_owner: ownerId,
    p_limit: SENTENCE_PAGE_SIZE,
  });
  if (error) fail('Monthly sentences unavailable', error);
  return data as { mode?: string } | null;
}

/** 내 일기장의 첫 쪽. 불러오지 못하면 throw. */
export async function fetchMySentences(userId: string): Promise<OwnSentences> {
  const data = await fetchSentences(userId);
  if (data?.mode !== 'own') fail('Monthly sentences unavailable', { code: 'not_own' });
  return data as OwnSentences;
}

/**
 * 서재에 보일 첫 쪽. 본인이 자기 서재를 열면 내 화면의 응답, 친구면 공개 문장만 든 응답이다.
 * 볼 수 없는 사이는 빈 친구 응답으로 돌려준다. 불러오지 못하면 throw.
 */
export async function fetchLibrarySentences(
  ownerId: string
): Promise<OwnSentences | FriendSentences> {
  const data = await fetchSentences(ownerId);
  if (data?.mode === 'own') return data as OwnSentences;
  if (data?.mode === 'friend') return data as FriendSentences;
  return { mode: 'friend', hasAnyExcerpt: false, rows: [], nextBefore: null };
}

/**
 * 설정에 보일 자동 기준. 저장한 적이 없으면 DB의 기본과 같은 좋아요 기준이다.
 * 이어 남긴 생각을 확인하지 못하면 꺼진 것으로 본다(고를 수 없는 기준을 내놓지 않는다).
 * 기준을 불러오지 못하면 throw.
 */
export async function fetchSentenceRule(userId: string): Promise<SentenceRuleSetting> {
  const supabase = await createSupabaseServerClient();
  const [saved, reflections] = await Promise.all([
    supabase.from('monthly_sentence_settings').select('rule').eq('user_id', userId).maybeSingle(),
    supabase.rpc('entry_reflections_enabled'),
  ]);
  if (saved.error) fail('Monthly sentence rule unavailable', saved.error);
  const rule = saved.data?.rule;
  return {
    rule: isSentenceRule(rule) ? rule : 'likes',
    reflectionsOn: !reflections.error && reflections.data === true,
  };
}
