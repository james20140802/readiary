import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * 안 읽은 알림 개수(정확히는 유무 판정용) — 루트 레이아웃에서 첫 페인트 전에
 * 서버에서 한 번 세어, 뱃지가 0에서 시작했다가 클라이언트 재조회 후 켜지는
 * 깜빡임 없이 처음부터 맞는 상태로 그려지게 한다. 실패하면 0(없음)으로 본다 —
 * 뱃지는 클라이언트 쪽 useUnreadNotifications가 곧이어 다시 세어 보정한다.
 */
export async function fetchUnreadNotificationCount(): Promise<number> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
