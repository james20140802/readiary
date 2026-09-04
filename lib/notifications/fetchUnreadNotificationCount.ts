import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * 안 읽은 알림 개수(정확히는 유무 판정용) — 루트 레이아웃에서 첫 페인트 전에
 * 서버에서 한 번 세어, 뱃지가 0에서 시작했다가 클라이언트 재조회 후 켜지는
 * 깜빡임 없이 처음부터 맞는 상태로 그려지게 한다.
 * 조회에 실패하면 0이 아니라 null(모름)을 돌려준다 — router.refresh로 레이아웃이 다시
 * 렌더될 때 일시적 실패가 0으로 둔갑해 클라이언트가 이미 맞게 켜 둔 뱃지를 지우지 않도록.
 * 미로그인은 확정된 "없음"이라 0.
 */
export async function fetchUnreadNotificationCount(): Promise<number | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    // 인증 조회 자체가 실패한 것(일시 장애)은 미로그인이 아니다 — 모름(null)
    if (authError) return null;
    if (!user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}
