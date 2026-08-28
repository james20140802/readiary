import { createClient } from '@supabase/supabase-js';
import { isUuid } from './validation';

export type PublicShareEntry = {
  id: string;
  quote: string | null;
  note: string | null;
  date: string;
  bookTitle: string;
  bookAuthor: string | null;
  nickname: string;
};

type PublicEntryRow = {
  id: string;
  quote: string | null;
  note: string | null;
  date: string;
  book_title: string;
  book_author: string | null;
  nickname: string;
};

/** 공개(비로그인) 문장 카드 데이터. 비공개·미존재 기록은 null. */
export async function fetchPublicEntry(entryId: string): Promise<PublicShareEntry | null> {
  if (!isUuid(entryId)) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await supabase
    .rpc('get_public_entry', { p_entry_id: entryId })
    .maybeSingle<PublicEntryRow>();

  if (error) {
    console.error('fetchPublicEntry 실패:', error);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    quote: data.quote,
    note: data.note,
    date: data.date,
    bookTitle: data.book_title,
    bookAuthor: data.book_author,
    nickname: data.nickname,
  };
}
