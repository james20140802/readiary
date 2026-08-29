import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { NotificationItem, NotificationType } from './types';

const NOTIFICATIONS_LIMIT = 50;

type ActorProfile = { nickname: string; profile_image: string | null };

function resolveActor(actor: ActorProfile | ActorProfile[] | null): ActorProfile | null {
  if (!actor) return null;
  return Array.isArray(actor) ? (actor[0] ?? null) : actor;
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, type, created_at, read_at, entry_id, actor:profiles!notifications_actor_id_fkey(nickname, profile_image)'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(NOTIFICATIONS_LIMIT);

  if (error || !data) return [];

  return data.map((row) => {
    const actor = resolveActor(row.actor);
    return {
      id: row.id,
      type: row.type as NotificationType,
      createdAt: row.created_at,
      readAt: row.read_at,
      entryId: row.entry_id,
      actorNickname: actor?.nickname ?? '알 수 없음',
      actorProfileImage: actor?.profile_image ?? null,
    };
  });
}
