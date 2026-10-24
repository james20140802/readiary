import { getServerUser } from '@/lib/supabase/getServerUser';
import { notFound } from 'next/navigation';
import { fetchProfileData } from '@/lib/profile/fetchProfileData';
import { fetchRetrospectData } from '@/lib/profile/fetchRetrospectData';
import { fetchFeaturedQuote } from '@/lib/profile/fetchFeaturedQuote';
import { fetchFeaturedBookmark } from '@/lib/profile/fetchFeaturedBookmark';
import { fetchBookReadingStats } from '@/lib/queries/fetchBookReadingStats';
import { getUserStats } from '@/lib/stats/getUserStats';
import { PROFILE_SHELF_LIMIT, toShelfBook } from '@/lib/books/shelfBook';
import { buildInviteSlug } from '@/lib/social/invite';
import { todayKST } from '@/lib/dates';
import MeView from '@/components/profile/MeView';
import { diaryShelf, formatPublishedDate, monthRows } from '@/components/profile/meModel';

export default async function ProfilePage() {
  const {
    data: { user },
    error: userError,
  } = await getServerUser();

  if (!user || userError) {
    return <p className="mt-10 text-center text-danger">로그인이 필요합니다.</p>;
  }

  const [{ profile, userBooks }, stats, retrospect, readingStats] = await Promise.all([
    fetchProfileData(user.id),
    getUserStats(user.id),
    fetchRetrospectData(user.id),
    fetchBookReadingStats(),
  ]);

  if (!profile || !userBooks) {
    return notFound();
  }

  const [featuredQuote, bookmark] = await Promise.all([
    fetchFeaturedQuote(profile.featured_entry_id, profile.id),
    fetchFeaturedBookmark(profile.bookmark_user_book_id, profile.id),
  ]);

  const shelfBooks = userBooks
    .slice(0, PROFILE_SHELF_LIMIT)
    .map((ub) =>
      toShelfBook(ub, readingStats, `/books/${ub.book_id}`, `/books/${ub.book_id}/entry/new`)
    );
  const today = todayKST();

  return (
    <MeView
      name={profile.name || profile.nickname || '이름 없음'}
      handle={`${profile.nickname}#${profile.tag || '0000'}`}
      inviteSlug={buildInviteSlug(profile.nickname, profile.tag)}
      bio={profile.bio}
      coverQuote={featuredQuote}
      year={Number(today.slice(0, 4))}
      publishedDate={formatPublishedDate(profile.created_at)}
      stats={stats}
      finishedBooks={retrospect?.finishedBooks ?? []}
      shelfBooks={shelfBooks}
      shelfTotal={userBooks.length}
      diary={diaryShelf(profile.created_at, today)}
      months={monthRows(retrospect?.monthly ?? [])}
      monthsError={!retrospect}
      bookmark={bookmark}
      canBookmark={userBooks.some((ub) => ub.is_finished)}
    />
  );
}
