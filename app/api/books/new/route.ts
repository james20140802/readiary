import { revalidatePath } from 'next/cache';
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

    if (!title || !author) {
      // total_pages, isbn, cover_url are optional
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // books는 ISBN으로 공유되는 공용 행 — 이미 있으면 그 행을 그대로 쓴다.
    // 클라이언트는 books를 UPDATE하지 않는다(RLS에 UPDATE 정책 없음). 다른 사용자가 등록한
    // 제목·저자·표지를 덮어쓰지 않기 위해서다.
    let bookId: string | null = null;
    if (isbn) {
      const { data: existing, error: existingError } = await supabase
        .from('books')
        .select('id')
        .eq('isbn', isbn)
        .maybeSingle();
      if (existingError) {
        return new Response(JSON.stringify({ error: 'Failed to create book' }), { status: 500 });
      }
      bookId = existing?.id ?? null;
    }

    if (!bookId) {
      const { data: book, error: bookError } = await supabase
        .from('books')
        .insert({ title, author, total_pages: total_pages ?? null, isbn, cover_url } as BookInsert)
        .select('id')
        .single();

      if (!book || bookError) {
        return new Response(JSON.stringify({ error: 'Failed to create book' }), { status: 500 });
      }
      bookId = book.id;
    }

    const { error: userBookError } = await supabase.from('user_books').insert({
      user_id: user.id,
      book_id: bookId,
    } as UserBookInsert);

    if (userBookError) {
      return new Response(JSON.stringify({ error: 'Failed to link book to user' }), {
        status: 500,
      });
    }

    // 등록 직후 목록·홈으로 돌아갔을 때 캐시된 화면이 새 책을 빠뜨리지 않도록
    revalidatePath('/protected/books');
    revalidatePath('/protected/dashboard');

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('Unexpected error in POST /api/books/new:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
