import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api/auth';
import {
  bookMarkdown,
  exportableEntries,
  exportFileName,
  monthMarkdown,
} from '@/lib/export/recordMarkdown';
import { exportHeaders, loadBookExport, loadMonthExport } from '@/lib/export/server';
import { getReflectionFeature } from '@/lib/features/entry-reflections';
import { uuidPattern } from '@/lib/reflections/types';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: exportHeaders });

/** 내 기록을 마크다운으로 — ?book=<user_book_id> 또는 ?month=YYYY-MM */
export async function GET(request: Request) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(exportHeaders);

  const params = new URL(request.url).searchParams;
  const bookId = params.get('book');
  const month = params.get('month');
  if (bookId ? !uuidPattern.test(bookId) || month : !month || !monthPattern.test(month))
    return fail('꺼낼 범위를 확인해 주세요.', 400);

  try {
    const supabase = await createSupabaseServerClient();
    const { enabled: includeReflections } = await getReflectionFeature();
    if (bookId) {
      const book = await loadBookExport(supabase, user.id, bookId, includeReflections);
      if (!book) return fail('책을 찾을 수 없어요.', 404);
      return NextResponse.json(
        {
          markdown: bookMarkdown(book),
          fileName: exportFileName(book.title),
          entryCount: exportableEntries(book.entries).length,
        },
        { headers: exportHeaders }
      );
    }
    const books = await loadMonthExport(supabase, user.id, month!, includeReflections);
    return NextResponse.json(
      {
        markdown: monthMarkdown(month!, books),
        fileName: exportFileName(month!),
        entryCount: books.reduce((sum, b) => sum + exportableEntries(b.entries).length, 0),
      },
      { headers: exportHeaders }
    );
  } catch (error) {
    console.error('Record export failed:', (error as { code?: string })?.code ?? error);
    return fail('기록을 불러오지 못했어요.', 500);
  }
}
