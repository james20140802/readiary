import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchProfileData } from '@/lib/profile/fetchProfileData';
import { fetchRetrospectData } from '@/lib/profile/fetchRetrospectData';
import { fetchBookReadingStats } from '@/lib/queries/fetchBookReadingStats';
import { getUserStats } from '@/lib/stats/getUserStats';
import { PROFILE_SHELF_LIMIT, toShelfBook } from '@/lib/books/shelfBook';
import ProfileCover from '@/components/profile/ProfileCover';
import ProfileShelf from '@/components/profile/ProfileShelf';
import ProfileColophon from '@/components/profile/ProfileColophon';
import ProfileRetrospect from '@/components/profile/ProfileRetrospect';
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

  const shelfBooks = userBooks
    .slice(0, PROFILE_SHELF_LIMIT)
    .map((ub) => toShelfBook(ub, readingStats, `/protected/books/${ub.book_id}`));

  return (
    <div className="pb-16">
      <AnimatedSection>
        <ProfileCover user={user} profile={profile}>
          {stats ? (
            <ProfileColophon stats={stats} />
          ) : (
            <p className="text-body-sm text-ink-faint">통계 정보를 불러올 수 없습니다.</p>
          )}
        </ProfileCover>
        <ProfileShelf
          books={shelfBooks}
          total={userBooks.length}
          shelfHref="/protected/books"
          isOwnProfile
        />
        {retrospect ? (
          <ProfileRetrospect data={retrospect} />
        ) : (
          <p className="mt-12 text-body-sm text-ink-faint">회고 정보를 불러올 수 없습니다.</p>
        )}
      </AnimatedSection>
    </div>
  );
}
