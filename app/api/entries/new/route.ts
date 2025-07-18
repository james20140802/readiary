import { createSupabaseServerClient } from '@/lib/supabase/server';
import { updateProgress } from '@/utils/sync';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { user_book_id, summary, from_page, to_page, date, is_private, book_id, user_id } = body;

    if (!user_book_id || !summary || from_page == null || to_page == null || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabase.from('entries').insert({
      user_book_id,
      summary,
      from_page,
      to_page,
      date,
      is_private: is_private ?? false,
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
    }
    await updateProgress(book_id, user_id);
    return NextResponse.json({ message: 'Entry created successfully' });
  } catch (error) {
    console.error('Unexpected error in POST /api/entries/new:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
