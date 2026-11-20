// app/(app)/social/talk/new/page.tsx — 발제하기. ?entry=<내 기록 id>면 밑줄 단계부터 시작한다.
import NewDebateFlow from '@/components/debate/NewDebateFlow';
import type { PickableEntry } from '@/lib/debate/client';
import { isUuid } from '@/lib/share/validation';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface Props {
  searchParams: Promise<{ entry?: string }>;
}

async function loadEntry(entryId: string, userId: string): Promise<PickableEntry | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('entries')
    .select('id, quote, from_page, is_private, user_books!inner(user_id, books(title, author))')
    .eq('id', entryId)
    .eq('user_books.user_id', userId)
    .maybeSingle();
  const row = data as unknown as {
    id: string;
    quote: string | null;
    from_page: number | null;
    is_private: boolean;
    user_books: { books: { title: string; author: string | null } | null } | null;
  } | null;
  if (!row?.quote?.trim()) return null;
  return {
    id: row.id,
    quote: row.quote,
    pageFrom: row.from_page,
    isPrivate: row.is_private,
    bookTitle: row.user_books?.books?.title ?? '',
    bookAuthor: row.user_books?.books?.author ?? null,
  };
}

export default async function NewDebatePage({ searchParams }: Props) {
  const { entry } = await searchParams;
  const {
    data: { user },
  } = await getServerUser();
  if (!user) return null;
  const initialEntry =
    entry && isUuid(entry) ? await loadEntry(entry.toLowerCase(), user.id) : null;
  return <NewDebateFlow initialEntry={initialEntry} />;
}
