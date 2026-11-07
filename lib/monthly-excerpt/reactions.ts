import { NextResponse } from 'next/server';
import { EXCERPT_NOT_FOUND, excerptHeaders } from './errors';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// 친구가 아니거나, 숨겨졌거나, 없는 권은 모두 같은 응답이다. 응답으로 권의 존재를 알아낼 수 없다.
export const excerptUnavailable = () =>
  NextResponse.json({ error: EXCERPT_NOT_FOUND }, { status: 404, headers: excerptHeaders });

export const reactionFailed = (code: string | undefined, error: string) => {
  // 로그에는 오류 코드만 남긴다. 댓글 본문은 남기지 않는다.
  console.error('Monthly excerpt reaction failed:', code);
  return NextResponse.json({ error }, { status: 500, headers: excerptHeaders });
};

/** 이 권을 볼 수 있는가. RLS가 최종 관문이고, 이 확인은 같은 404를 먼저 돌려주기 위한 것이다. */
export async function canViewExcerpt(
  supabase: Supabase,
  id: string
): Promise<{ allowed: boolean; errorCode?: string; failed: boolean }> {
  const { data, error } = await supabase.rpc('can_view_monthly_excerpt', { p_id: id });
  if (error) return { allowed: false, failed: true, errorCode: error.code };
  return { allowed: data === true, failed: false };
}
