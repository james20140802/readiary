import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchProfileData } from '@/lib/profile/fetchProfileData';
import { fetchRetrospectData } from '@/lib/profile/fetchRetrospectData';
import { fetchFeaturedQuote } from '@/lib/profile/fetchFeaturedQuote';
import { fetchFeaturedBookmark } from '@/lib/profile/fetchFeaturedBookmark';
import { fetchBookReadingStats } from '@/lib/queries/fetchBookReadingStats';
import { getUserStats } from '@/lib/stats/getUserStats';
import { PROFILE_SHELF_LIMIT, toShelfBook } from '@/lib/books/shelfBook';
import ProfileBook from '@/components/profile/ProfileBook';
import ProfileShelf from '@/components/profile/ProfileShelf';
import ProfileExcerpts from '@/components/profile/ProfileExcerpts';
import AnimatedSection from '@/components/ui/AnimatedSection';

const excerptsHref = (bookId: string) => `/protected/books/${bookId}/excerpts`;

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return <p className="text-center mt-10 text-danger">로그인이 필요합니다.</p>;
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
    .map((ub) => toShelfBook(ub, readingStats, `/protected/books/${ub.book_id}`));
  const finishedBooks = retrospect?.finishedBooks ?? [];

  return (
    <div className="pb-16">
      <AnimatedSection>
        <ProfileBook
          user={user}
          profile={profile}
          stats={stats}
          monthly={retrospect?.monthly ?? []}
          featuredQuote={featuredQuote}
          bookmark={bookmark}
          bookmarkHref={bookmark ? excerptsHref(bookmark.bookId) : null}
          canBookmark={finishedBooks.length > 0}
        />
        <ProfileShelf
          books={shelfBooks}
          total={userBooks.length}
          shelfHref="/protected/books"
          isOwnProfile
        />
        <ProfileExcerpts books={finishedBooks} hrefFor={excerptsHref} />
      </AnimatedSection>
    </div>
  );
}
