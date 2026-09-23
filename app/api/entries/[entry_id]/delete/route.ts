import { unauthorized } from '@/lib/api/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { updateProgress } from '@/utils/sync';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, { params }: { params: Promise<{ entry_id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const entry_id = (await params).entry_id;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return unauthorized();
  }
  const { searchParams } = new URL(req.url);
  const book_id = searchParams.get('book_id');

  if (!book_id) {
    return NextResponse.json({ error: 'book_id가 필요합니다.' }, { status: 400 });
  }

  if (!entry_id) {
    return NextResponse.json({ error: 'entry_id 필요합니다.' }, { status: 400 });
  }

  // 1. Fetch the entry
  const { data: entry, error: entryError } = await supabase
    .from('entries')
    .select('user_book_id')
    .eq('id', entry_id)
    .single();

  if (entryError || !entry) {
    return NextResponse.json({ error: '엔트리를 찾을 수 없습니다.' }, { status: 404 });
  }

  // 2. Fetch user_book to validate ownership
  const { data: userBook, error: userBookError } = await supabase
    .from('user_books')
    .select('user_id')
    .eq('id', entry.user_book_id)
    .single();

  if (userBookError || !userBook || userBook.user_id !== user.id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  // 3. Perform deletion
  const rawCount = searchParams.get('reflection_count');
  const acknowledgedCount = rawCount === null ? null : Number(rawCount);
  if (
    acknowledgedCount !== null &&
    (!/^\d+$/.test(rawCount!) || !Number.isSafeInteger(acknowledgedCount))
  )
    return NextResponse.json({ error: '함께 삭제할 생각 수를 확인해 주세요.' }, { status: 400 });
  const { data: result, error } = await supabase.rpc('mutate_entry_with_reflection_ack', {
    p_entry_id: entry_id,
    p_delete: true,
    p_reflection_count: acknowledgedCount,
  });
  const outcome = result as { id?: string; confirmation_required?: boolean } | null;
  if (outcome?.confirmation_required)
    return NextResponse.json(
      {
        code: 'reflection_confirmation_required',
        error: '함께 삭제할 생각 수가 변경됐어요. 다시 확인해 주세요.',
      },
      { status: 409, headers: { 'Cache-Control': 'private, no-store' } }
    );
  if (!error && !outcome?.id)
    return NextResponse.json({ error: '엔트리를 찾을 수 없습니다.' }, { status: 404 });

  if (error) {
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }

  await updateProgress(book_id, user.id);

  return NextResponse.json({ message: '삭제 성공' });
}
