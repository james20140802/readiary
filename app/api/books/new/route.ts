import { unauthorized } from '@/lib/api/auth';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/share/validation';
import { randomUUID } from 'node:crypto';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return unauthorized();
    }

    const { title, author, total_pages, isbn, cover_url, client_request_id } = await req.json();
    if (
      typeof title !== 'string' ||
      !title.trim() ||
      typeof author !== 'string' ||
      !author.trim() ||
      (client_request_id !== undefined && !isUuid(client_request_id)) ||
      (total_pages != null && (!Number.isInteger(total_pages) || total_pages <= 0)) ||
      (isbn != null && typeof isbn !== 'string') ||
      (cover_url != null && typeof cover_url !== 'string')
    ) {
      return Response.json({ error: 'Invalid book fields' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('register_book_idempotently', {
      p_request_id: client_request_id ?? randomUUID(),
      p_title: title.trim(),
      p_author: author.trim(),
      p_total_pages: total_pages ?? null,
      p_isbn: isbn?.trim() || null,
      p_cover_url: cover_url?.trim() || null,
    });
    if (error || !data) {
      return Response.json(
        {
          error:
            error?.code === 'PT409'
              ? '같은 요청 번호로 다른 책을 등록할 수 없습니다.'
              : 'Failed to create book',
        },
        { status: error?.code === 'PT409' ? 409 : 500 }
      );
    }
    // 등록 직후 목록·홈으로 돌아갔을 때 캐시된 화면이 새 책을 빠뜨리지 않도록
    revalidatePath('/protected/books');
    revalidatePath('/protected/dashboard');

    return Response.json({
      success: true,
      ...(data as { book_id: string; user_book_id: string; replayed: boolean }),
    });
  } catch (err) {
    console.error('Unexpected error in POST /api/books/new:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
