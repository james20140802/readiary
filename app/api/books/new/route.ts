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

    const { title, author, total_pages, isbn, cover_url } = await req.json();

    if (!title || !author || !total_pages) {
      // isbn and cover_url are optional
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    if (isbn) {
      const { data: existingBook, error: fetchError } = await supabase
        .from('books')
        .select('id')
        .eq('isbn', isbn)
        .maybeSingle();

      if (fetchError) {
        return new Response(JSON.stringify({ error: 'Failed to check existing book' }), {
          status: 500,
        });
      }

      if (existingBook) {
        const { error: userBookError } = await supabase.from('user_books').insert({
          user_id: user.id,
          book_id: (existingBook as any).id,
        });

        if (userBookError) {
          return new Response(JSON.stringify({ error: 'Failed to link book to user' }), {
            status: 500,
          });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
    }

    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({ title, author, total_pages, isbn, cover_url })
      .select('*')
      .single();

    if (!book || bookError) {
      return new Response(JSON.stringify({ error: 'Failed to create book' }), { status: 500 });
    }

    const bookId = book.id;

    const { error: userBookError } = await supabase.from('user_books').insert({
      user_id: user.id,
      book_id: bookId,
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
