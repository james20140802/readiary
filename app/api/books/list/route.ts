import { unauthorized } from '@/lib/api/auth';
import { fetchMyBooksData } from '@/lib/queries/fetchBooks';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return unauthorized();
  }

  try {
    const books = await fetchMyBooksData();
    return Response.json(books);
  } catch (err) {
    return new Response(JSON.stringify({ error: '데이터를 불러오지 못했습니다.', message: err }), {
      status: 500,
    });
  }
}
