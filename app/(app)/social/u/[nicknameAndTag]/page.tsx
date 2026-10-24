import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { notFound } from 'next/navigation';
import { getUserStats } from '@/lib/stats/getUserStats';
import { fetchProfileData } from '@/lib/profile/fetchProfileData';
import { fetchRetrospectData } from '@/lib/profile/fetchRetrospectData';
import { fetchFeaturedQuote } from '@/lib/profile/fetchFeaturedQuote';
import { parseNicknameAndTagSlug } from '@/lib/social/invite';
import { PROFILE_SHELF_LIMIT, toShelfBook } from '@/lib/books/shelfBook';
import FriendLibraryView from '@/components/social/library/FriendLibraryView';

interface FriendProfilePageProps {
  params: Promise<{ nicknameAndTag: string }>;
}

export default async function FriendProfilePage({ params }: FriendProfilePageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getServerUser();
  if (!user) return notFound();

  const slug = (await params).nicknameAndTag;
  const parsed = parseNicknameAndTagSlug(slug);
  if (!parsed) return notFound();
  const { nickname, tag } = parsed;

  const { profile, userBooks } = await fetchProfileData(nickname, tag);
  if (!profile) return notFound();

  const { data: friendRecord } = await supabase
    .from('friends')
    .select('id')
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${user.id})`
    )
    .eq('status', 'accepted')
    .maybeSingle();

  const isFriend = !!friendRecord;
  if (!isFriend && user.id !== profile.id) return notFound();

  // 친구에게는 공개 기록으로 만든 값만 보인다 — 쿼리에서 비공개를 거른다.
  // 본인이 자기 소셜 주소를 열면 /profile과 같이 비공개 포함
  const isOwn = user.id === profile.id;
  const publicOnly = { publicOnly: !isOwn };
  const [stats, retrospect, featuredQuote] = await Promise.all([
    getUserStats(profile.id),
    fetchRetrospectData(profile.id, publicOnly),
    fetchFeaturedQuote(profile.featured_entry_id, profile.id, publicOnly),
  ]);

  // 친구의 읽기 통계(기간·문장 수)는 본인 것만 조회 가능해 비워 둔다
  const base = `/social/u/${slug}`;
  const shelfHref = `${base}/books`;
  const bookHref = (bookId: string) => `${shelfHref}/${bookId}`;
  const shelfBooks = userBooks
    .slice(0, PROFILE_SHELF_LIMIT)
    .map((ub) => toShelfBook(ub, null, bookHref(ub.book_id)));

  const reading = userBooks.find((ub) => !ub.is_finished);
  const current = reading
    ? {
        title: reading.books.title ?? '(제목 없음)',
        coverUrl: reading.books.cover_url ?? null,
        lastReadPage: reading.last_read_page,
        totalPages: reading.books.total_pages,
        href: bookHref(reading.book_id),
      }
    : null;

  // 최근 문장 — 회고 집계(최근 달부터)에 이미 실린 미리보기에서 세 줄만
  const sentences = (retrospect?.monthly ?? [])
    .flatMap((month) =>
      (month.quotePreviews ?? month.quotes.map((quote) => ({ entryId: null, quote }))).map(
        (q, i) => ({
          key: q.entryId ?? `${month.label}-${i}`,
          quote: q.quote,
          meta: month.label,
          // 본인 것은 비공개도 섞여 있어 내 기록 화면으로 연다
          href: q.entryId ? (isOwn ? `/entry/${q.entryId}` : `${base}/entry/${q.entryId}`) : null,
        })
      )
    )
    .slice(0, 3);

  const excerpts = (retrospect?.finishedBooks ?? []).map((b) => ({
    bookId: b.bookId,
    title: b.title,
    coverUrl: b.coverUrl,
    quoteCount: b.quoteCount,
    href: bookHref(b.bookId),
  }));

  return (
    <FriendLibraryView
      profile={profile}
      isOwn={isOwn}
      stats={stats}
      featuredQuote={featuredQuote}
      current={current}
      sentences={sentences}
      shelfBooks={shelfBooks}
      shelfTotal={userBooks.length}
      shelfHref={shelfHref}
      excerpts={excerpts}
      retrospectError={!retrospect}
    />
  );
}
