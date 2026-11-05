import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api/auth';
import { badRequest, excerptHeaders } from '@/lib/monthly-excerpt/errors';
import {
  canViewExcerpt,
  excerptUnavailable,
  reactionFailed,
} from '@/lib/monthly-excerpt/reactions';
import { notifyMonthlyExcerptEvent } from '@/lib/notifications/notify';
import { isUuid } from '@/lib/share/validation';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface Context {
  params: Promise<{ id: string }>;
}

// 멱등 키는 내려보내지 않는다.
const COLUMNS =
  'id, excerpt_id, user_id, content, parent_id, created_at, profile:profiles(id, name, nickname, tag, profile_image, bio, created_at)';

// PostgreSQL은 UUID를 소문자로 돌려주므로 비교 전에 맞춘다.
const canonicalUuid = (value: unknown) =>
  typeof value === 'string' && isUuid(value) ? value.toLowerCase() : value;

// GET: 댓글 목록. 응답 모양은 /api/comments와 같다.
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
  if (view.failed) return reactionFailed(view.errorCode, '댓글을 불러오지 못했어요.');
  if (!view.allowed) return excerptUnavailable();

  const { data, error } = await supabase
    .from('monthly_excerpt_comments')
    .select(COLUMNS)
    .eq('excerpt_id', excerptId)
    .order('created_at', { ascending: true });
  if (error) return reactionFailed(error.code, '댓글을 불러오지 못했어요.');
  return NextResponse.json(data, { headers: excerptHeaders });
}

// POST: 댓글 작성(답글 포함). 멱등 키와 재시도 동작은 /api/comments와 같다.
export async function POST(request: Request, { params }: Context) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(excerptHeaders);

  const { id } = await params;
  if (!isUuid(id)) return badRequest('발췌집을 확인해 주세요.');
  const excerptId = id.toLowerCase();

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const content = body?.content;
  if (typeof content !== 'string' || !content.trim()) return badRequest('댓글을 입력해 주세요.');
  const clientCommentId = canonicalUuid(body?.client_comment_id) as string | null | undefined;
  if (clientCommentId != null && !isUuid(clientCommentId)) return badRequest('Invalid comment ID');
  const parentId = canonicalUuid(body?.parentId) as string | null | undefined;
  if (parentId != null && !isUuid(parentId)) return badRequest('답글을 달 댓글을 확인해 주세요.');

  const supabase = await createSupabaseServerClient();
  const view = await canViewExcerpt(supabase, excerptId);
  if (view.failed) return reactionFailed(view.errorCode, '발췌집을 확인하지 못했어요.');
  if (!view.allowed) return excerptUnavailable();

  const { data, error } = await supabase
    .from('monthly_excerpt_comments')
    .insert({
      // 작성 훅(useCreationSubmission)은 응답 id가 멱등 키와 같은지 확인하므로 id도 같은 값을 쓴다.
      ...(clientCommentId ? { id: clientCommentId, client_comment_id: clientCommentId } : {}),
      excerpt_id: excerptId,
      user_id: user.id,
      content,
      parent_id: parentId ?? null,
    })
    .select(COLUMNS)
    .single();

  // 확인 직후 숨겨지거나 친구를 끊으면 최종 RLS가 막는다. 같은 404로 답한다.
  if (error?.code === '42501') return excerptUnavailable();
  // 부모 댓글이 이 권에 없다. 지워졌거나 다른 권의 댓글이다.
  if (error?.code === '23503') return badRequest('답글을 달 댓글을 찾을 수 없어요.');

  if (error?.code === '23505' && clientCommentId) {
    const { data: existing, error: readError } = await supabase
      .from('monthly_excerpt_comments')
      .select(COLUMNS)
      .eq('client_comment_id', clientCommentId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (readError) return reactionFailed(readError.code, 'Failed to read comment');
    // 같은 제출의 재시도다. 알림을 다시 보내지 않는다.
    if (
      existing &&
      existing.excerpt_id === excerptId &&
      existing.parent_id === (parentId ?? null) &&
      existing.content === content
    ) {
      return NextResponse.json(existing, { headers: excerptHeaders });
    }
    return NextResponse.json(
      { error: 'Comment ID already used' },
      { status: 409, headers: excerptHeaders }
    );
  }
  if (error) return reactionFailed(error.code, '댓글을 남기지 못했어요.');

  await notifyMonthlyExcerptEvent(supabase, excerptId, 'excerpt_comment', data.id);
  return NextResponse.json(data, { headers: excerptHeaders });
}

// DELETE: 본인 댓글만 지운다(/api/comments와 같은 규칙). 답글과 알림은 DB에서 함께 사라진다.
export async function DELETE(request: Request, { params }: Context) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(excerptHeaders);

  const { id } = await params;
  const commentId = new URL(request.url).searchParams.get('id');
  if (!isUuid(id) || !commentId || !isUuid(commentId)) return badRequest('댓글을 확인해 주세요.');

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('monthly_excerpt_comments')
    .delete()
    .eq('id', commentId.toLowerCase())
    .eq('excerpt_id', id.toLowerCase())
    .eq('user_id', user.id)
    .select('id');
  if (error) return reactionFailed(error.code, '댓글을 지우지 못했어요.');
  // 남의 댓글이거나 숨겨진 권이면 지워진 행이 없다. 성공으로 답하면 화면과 어긋난다.
  if (!data || data.length === 0) return excerptUnavailable();
  return NextResponse.json({ success: true }, { headers: excerptHeaders });
}
