import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET: 댓글 목록 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get('entry_id');
  const supabase = await createSupabaseServerClient();

  if (!entryId) return NextResponse.json({ error: 'entryId가 필요합니다.' }, { status: 400 });

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
