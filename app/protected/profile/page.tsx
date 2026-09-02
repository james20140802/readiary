import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchProfileData } from '@/lib/profile/fetchProfileData';
import { fetchRetrospectData } from '@/lib/profile/fetchRetrospectData';
import { fetchFeaturedQuote } from '@/lib/profile/fetchFeaturedQuote';
import { fetchBookReadingStats } from '@/lib/queries/fetchBookReadingStats';
import { getUserStats } from '@/lib/stats/getUserStats';
import { PROFILE_SHELF_LIMIT, toShelfBook } from '@/lib/books/shelfBook';
import ProfileBook from '@/components/profile/ProfileBook';
import ProfileShelf from '@/components/profile/ProfileShelf';
import AnimatedSection from '@/components/ui/AnimatedSection';

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

  const featuredQuote = await fetchFeaturedQuote(profile.featured_entry_id);

  const shelfBooks = userBooks
    .slice(0, PROFILE_SHELF_LIMIT)
    .map((ub) => toShelfBook(ub, readingStats, `/protected/books/${ub.book_id}`));

  return (
    <div className="pb-16">
      <AnimatedSection>
        <ProfileBook
          user={user}
          profile={profile}
          stats={stats}
          retrospect={retrospect}
          featuredQuote={featuredQuote}
        />
        <ProfileShelf
          books={shelfBooks}
          total={userBooks.length}
          shelfHref="/protected/books"
          isOwnProfile
        />
      </AnimatedSection>
    </div>
  );
}
