import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyEntryEvent } from '@/lib/notifications/notify';
import { NextResponse } from 'next/server';
import { isUuid } from '@/lib/share/validation';

// GET: 댓글 목록 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get('entry_id');
  const supabase = await createSupabaseServerClient();

  if (!entryId || !isUuid(entryId)) {
    return NextResponse.json({ error: 'entryId가 필요합니다.' }, { status: 400 });
  }

  // 로그인한 사용자만, 그리고 볼 수 있는 기록(본인 것이거나 공개 기록)의 댓글만 —
  // 예전엔 entry_id만 알면 누구나 댓글과 작성자 프로필을 읽을 수 있었다
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '인증되지 않은 유저입니다.' }, { status: 401 });

  const { data: entry } = await supabase
    .from('entries')
    .select('id, is_private, user_books!inner(user_id)')
    .eq('id', entryId)
    .maybeSingle();
  const owner = Array.isArray(entry?.user_books) ? entry?.user_books[0] : entry?.user_books;
  if (!entry) return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 });
  if (entry.is_private && owner?.user_id !== user.id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('comments')
    .select(
      `
      *,
      profile:profiles(id, name, nickname, tag, profile_image, bio, created_at)
    `
    )
    .eq('entry_id', entryId)
    .order('created_at', { ascending: true }); // 과거 순 정렬

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: 댓글 작성
export async function POST(request: Request) {
  const { entryId, content, parentId } = await request.json();
  const supabase = await createSupabaseServerClient();

  // 현재 로그인 유저 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '인증되지 않은 유저입니다.' }, { status: 401 });

  const { data, error } = await supabase
    .from('comments')
    .insert([
      {
        entry_id: entryId,
        user_id: user.id,
        content,
        parent_id: parentId || null,
      },
    ])
    .select(
      `
      *,
      profile:profiles(id, name, nickname, tag, profile_image, bio, created_at)
    `
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 알림을 이 댓글 행에 매단다 — 댓글을 지우면 알림도 DB에서 함께 사라진다
  await notifyEntryEvent(supabase, entryId, 'comment', data.id);

  return NextResponse.json(data);
}

// DELETE: 댓글 삭제
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get('id');
  const supabase = await createSupabaseServerClient();

  if (!commentId) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });

  // 1. 현재 로그인 유저 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '인증되지 않은 유저입니다.' }, { status: 401 });

  // 2. 삭제 시도 (RLS 정책에 의해 본인 것만 삭제됨)
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id); // 한 번 더 본인 확인

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
