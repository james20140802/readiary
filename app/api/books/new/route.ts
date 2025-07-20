import { createSupabaseServerClient } from '@/lib/supabase/server';

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

    const { title, author, total_pages } = await req.json();

    if (!title || !author || !total_pages) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({ title, author, total_pages })
      .select()
      .single();

    if (!book || bookError) {
      return new Response(JSON.stringify({ error: 'Failed to create book' }), { status: 500 });
    }

    const { error: userBookError } = await supabase.from('user_books').insert({
      user_id: user.id,
      book_id: book.id,
    });

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
