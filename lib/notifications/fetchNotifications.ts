import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getImageUrl } from '@/utils/profile';
import { NOTIFICATIONS_LIMIT } from './types';
import type { NotificationItem, NotificationType } from './types';

export { NOTIFICATIONS_LIMIT };

type ActorProfile = { nickname: string; profile_image: string | null };

function resolveActor(actor: ActorProfile | ActorProfile[] | null): ActorProfile | null {
  if (!actor) return null;
  return Array.isArray(actor) ? (actor[0] ?? null) : actor;
}

export interface FetchNotificationsResult {
  items: NotificationItem[];
  /** true면 조회 자체가 실패한 것 — UI는 "알림 없음"이 아니라 에러 문구를 보여줘야 한다 */
  error: boolean;
}

export async function fetchNotifications(): Promise<FetchNotificationsResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], error: false };

  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, type, created_at, read_at, entry_id, actor:profiles!notifications_actor_id_fkey(nickname, profile_image)'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(NOTIFICATIONS_LIMIT);

  if (error || !data) return { items: [], error: true };

  const items = data.map((row) => {
    const actor = resolveActor(row.actor);
    return {
      id: row.id,
      type: row.type as NotificationType,
      createdAt: row.created_at,
      readAt: row.read_at,
      entryId: row.entry_id,
      actorNickname: actor?.nickname ?? '알 수 없음',
      // DB에는 스토리지 경로가 저장됨 — next/image가 파싱 가능한 공개 URL로 변환
      actorProfileImage: getImageUrl(actor?.profile_image ?? null),
    };
  });

  return { items, error: false };
}
