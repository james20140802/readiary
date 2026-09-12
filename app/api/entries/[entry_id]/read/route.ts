import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api/auth';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { EntryReadData } from '@/types/entry';

const headers = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' };
const unavailable = () =>
  NextResponse.json({ error: '기록을 볼 수 없습니다.' }, { status: 404, headers });
const failed = () =>
  NextResponse.json({ error: '기록을 불러오지 못했습니다.' }, { status: 500, headers });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entry_id: string }> }
) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (!user || authError) return unauthorized(headers);
  const { entry_id: entryId } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(entryId)) return unavailable();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('entries')
    .select(
      'id, date, from_page, to_page, quote, note, is_private, user_books!inner(user_id, books!inner(title))'
    )
    .eq('id', entryId)
    .maybeSingle();
  if (error) return failed();
  if (!data) return unavailable();
  const ownerId = data.user_books.user_id;
  if (ownerId !== user.id) {
    if (data.is_private) return unavailable();
    const { data: friendship, error: friendshipError } = await supabase
      .from('friends')
      .select('id')
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${ownerId}),and(user_id.eq.${ownerId},friend_id.eq.${user.id})`
      )
      .eq('status', 'accepted')
      .limit(1)
      .maybeSingle();
    if (friendshipError) return failed();
    if (!friendship) return unavailable();
  }
  const entry: EntryReadData = {
    id: data.id,
    bookTitle: data.user_books.books.title,
    date: data.date,
    fromPage: data.from_page,
    toPage: data.to_page,
    quote: data.quote,
    note: data.note,
  };
  return NextResponse.json(entry, { headers });
}
