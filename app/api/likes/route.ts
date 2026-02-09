import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { entryId } = await request.json();

  // 1. 현재 로그인한 유저 정보 가져오기
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
  }

  // 2. 이미 좋아요를 눌렀는지 확인
  const { data: existingLike } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('entry_id', entryId)
    .single();

  if (existingLike) {
    // 3. 이미 있다면 삭제 (좋아요 취소)
    const { error: deleteError } = await supabase.from('likes').delete().eq('id', existingLike.id);

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
    return NextResponse.json({ message: 'unliked', liked: false });
  } else {
    // 4. 없다면 추가 (좋아요 실행)
    const { error: insertError } = await supabase.from('likes').insert({
      user_id: user.id,
      entry_id: entryId,
    });

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({ message: 'liked', liked: true });
  }
}
