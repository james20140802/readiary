import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api/auth';
import { isUuid } from '@/lib/share/validation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const headers = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ user_book_id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return unauthorized();
  const { user_book_id } = await params;
  if (!isUuid(user_book_id)) {
    return NextResponse.json({ error: '책 정보를 확인해 주세요.' }, { status: 400, headers });
  }

  // One atomic DELETE: existing FKs cascade entries, reflections and reactions,
  // and clear profile references. Never delete the shared books catalog row.
  // Scope by registration ID, not book ID: replay cannot remove a re-added book.
  const { error } = await supabase
    .from('user_books')
    .delete()
    .eq('id', user_book_id)
    .eq('user_id', user.id);
  if (error) {
    return NextResponse.json(
      { error: '책을 삭제하지 못했어요. 다시 시도해 주세요.' },
      { status: 500, headers }
    );
  }
  // Absent/inaccessible registrations are no-op successes: safe retries after
  // response loss, without exposing another reader's library.
  revalidatePath('/', 'layout');
  return new NextResponse(null, { status: 204, headers });
}
