import { createSupabaseServerClient } from '@/lib/supabase/server';
import { updateProgress } from '@/utils/sync';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, { params }: { params: { entry_id: string } }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const book_id = searchParams.get('book_id');

  if (!book_id) {
    return NextResponse.json({ error: 'book_id가 필요합니다.' }, { status: 400 });
  }

  // 1. Fetch the entry
  const { data: entry, error: entryError } = await supabase
    .from('entries')
    .select('user_book_id')
    .eq('id', params.entry_id)
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
  const { error } = await supabase.from('entries').delete().eq('id', params.entry_id);

  if (error) {
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }

  await updateProgress(book_id, user.id);

  return NextResponse.json({ message: '삭제 성공' });
}
