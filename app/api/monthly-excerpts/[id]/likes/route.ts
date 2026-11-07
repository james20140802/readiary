import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api/auth';
import { badRequest, excerptHeaders } from '@/lib/monthly-excerpt/errors';
import {
  canViewExcerpt,
  excerptUnavailable,
  reactionFailed,
} from '@/lib/monthly-excerpt/reactions';
import {
  notifyMonthlyExcerptEvent,
  retractMonthlyExcerptLikeNotification,
} from '@/lib/notifications/notify';
import { isUuid } from '@/lib/share/validation';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface Context {
  params: Promise<{ id: string }>;
}

const FAILED = '좋아요를 처리하지 못했어요.';

// 달의 발췌집을 좋아한 사람들. 응답 모양은 /api/likes와 같다.
export async function GET(_request: Request, { params }: Context) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(excerptHeaders);

  const { id } = await params;
  if (!isUuid(id)) return badRequest('발췌집을 확인해 주세요.');
  const excerptId = id.toLowerCase();

  const supabase = await createSupabaseServerClient();
  const view = await canViewExcerpt(supabase, excerptId);
  if (view.failed) return reactionFailed(view.errorCode, FAILED);
  if (!view.allowed) return excerptUnavailable();

  const { data: likes, error: likesError } = await supabase
    .from('monthly_excerpt_likes')
    .select('user_id, created_at')
    .eq('excerpt_id', excerptId)
    .order('created_at', { ascending: true });
  if (likesError) return reactionFailed(likesError.code, FAILED);
  if (!likes || likes.length === 0) return NextResponse.json([], { headers: excerptHeaders });

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, nickname, tag')
    .in(
      'id',
      likes.map((like) => like.user_id)
    );
  if (profilesError) return reactionFailed(profilesError.code, FAILED);

  // 프로필 페이지는 본인과 수락된 친구만 열 수 있어, 그 외의 사람에게는 링크를 걸지 않도록 알려 준다.
  const { data: friendRows, error: friendsError } = await supabase
    .from('friends')
    .select('user_id, friend_id')
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .eq('status', 'accepted');
  if (friendsError) return reactionFailed(friendsError.code, FAILED);

  const friendIds = new Set(
    (friendRows ?? []).map((row) => (row.user_id === user.id ? row.friend_id : row.user_id))
  );
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const likers = likes.flatMap((like) => {
    const profile = profileMap.get(like.user_id);
    return profile
      ? [
          {
            ...profile,
            liked_at: like.created_at,
            is_accessible: profile.id === user.id || friendIds.has(profile.id),
          },
        ]
      : [];
  });
  return NextResponse.json(likers, { headers: excerptHeaders });
}

// 좋아요 토글. 응답 모양은 /api/likes와 같다.
export async function POST(_request: Request, { params }: Context) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(excerptHeaders);

  const { id } = await params;
  if (!isUuid(id)) return badRequest('발췌집을 확인해 주세요.');
  const excerptId = id.toLowerCase();

  const supabase = await createSupabaseServerClient();
  const view = await canViewExcerpt(supabase, excerptId);
  if (view.failed) return reactionFailed(view.errorCode, FAILED);
  if (!view.allowed) return excerptUnavailable();

  const { data: existing, error: readError } = await supabase
    .from('monthly_excerpt_likes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('excerpt_id', excerptId)
    .maybeSingle();
  if (readError) return reactionFailed(readError.code, FAILED);

  if (existing) {
    const { data: removed, error } = await supabase
      .from('monthly_excerpt_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('excerpt_id', excerptId)
      .select('user_id');
    if (error) return reactionFailed(error.code, FAILED);
    // 확인 직후 숨겨지면 지워진 행이 없다. 성공으로 답하면 화면과 어긋난다(댓글 DELETE와 같다).
    if (!removed || removed.length === 0) return excerptUnavailable();
    await retractMonthlyExcerptLikeNotification(supabase, excerptId);
    return NextResponse.json({ message: 'unliked', liked: false }, { headers: excerptHeaders });
  }

  const { error } = await supabase
    .from('monthly_excerpt_likes')
    .insert({ user_id: user.id, excerpt_id: excerptId });
  // 확인 직후 숨겨지면 최종 RLS가 막는다. 같은 404로 답한다.
  if (error?.code === '42501') return excerptUnavailable();
  // 동시에 두 번 눌렀다. 좋아요는 이미 남아 있다.
  if (error && error.code !== '23505') return reactionFailed(error.code, FAILED);

  await notifyMonthlyExcerptEvent(supabase, excerptId, 'excerpt_like');
  return NextResponse.json({ message: 'liked', liked: true }, { headers: excerptHeaders });
}
