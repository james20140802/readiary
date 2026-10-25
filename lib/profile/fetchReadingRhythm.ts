import { todayKST } from '@/lib/dates';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RHYTHM_MONTHS, buildRhythm, rhythmMonthKeys, type RhythmMonth } from './readingRhythm';

/** 최근 석 달의 기록 시각 무늬 — DB가 칸별 개수만 센다. 읽지 못하면 null, 화면은 그 칸을 그리지 않는다 */
export async function fetchReadingRhythm(): Promise<RhythmMonth[] | null> {
  const today = todayKST();
  const [first] = rhythmMonthKeys(today, RHYTHM_MONTHS);
  // KST 달 첫날 0시 = 전날 15시 UTC
  const since = new Date(`${first}-01T00:00:00+09:00`).toISOString();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('reading_rhythm', { p_since: since });
  if (error) {
    console.error('Reading rhythm unavailable:', error.code);
    return null;
  }
  return buildRhythm(data ?? [], today, RHYTHM_MONTHS);
}
