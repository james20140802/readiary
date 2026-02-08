import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';

type BookInsert = Database['public']['Tables']['books']['Insert'];
type UserBookInsert = Database['public']['Tables']['user_books']['Insert'];
export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { title, author, total_pages, isbn, cover_url } = await req.json();

    if (!title || !author || !total_pages) {
      // isbn and cover_url are optional
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const { data: book, error: bookError } = await supabase
      .from('books')
      .upsert({ title, author, total_pages, isbn, cover_url } as BookInsert, { onConflict: 'isbn' })
      .select('*')
      .single();

    if (!book || bookError) {
      return new Response(JSON.stringify({ error: 'Failed to create book' }), { status: 500 });
    }

    const bookId = book.id;

    const { error: userBookError } = await supabase.from('user_books').insert({
      user_id: user.id,
      book_id: bookId,
    } as UserBookInsert);

    if (userBookError) {
      return new Response(JSON.stringify({ error: 'Failed to link book to user' }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('Unexpected error in POST /api/books/new:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
