import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { getUserStats } from '@/lib/stats/getUserStats';
import { fetchProfileData } from '@/lib/profile/fetchProfileData';
import { fetchRetrospectData } from '@/lib/profile/fetchRetrospectData';
import { fetchFeaturedQuote } from '@/lib/profile/fetchFeaturedQuote';
import { fetchFeaturedBookmark } from '@/lib/profile/fetchFeaturedBookmark';
import { PROFILE_SHELF_LIMIT, toShelfBook } from '@/lib/books/shelfBook';
import ProfileBook from '@/components/profile/ProfileBook';
import ProfileShelf from '@/components/profile/ProfileShelf';
import ProfileExcerpts from '@/components/profile/ProfileExcerpts';
import AnimatedSection from '@/components/ui/AnimatedSection';
import BackButton from '@/components/ui/BackButton';

interface FriendProfilePageProps {
  params: Promise<{ nicknameAndTag: string }>;
}

export default async function FriendProfilePage({ params }: FriendProfilePageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  const slug = (await params).nicknameAndTag;
  const decoded = decodeURIComponent(slug);
  const processed = decoded.startsWith('@') ? decoded.slice(1) : decoded;
  const [nickname, tag] = processed.split('-');
  if (!nickname || !tag) return notFound();

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

  // 친구 책의 책갈피·인덱스·뒷표지는 공개 기록만으로 만들어진다 — 쿼리에서 비공개를 거른다
  const publicOnly = { publicOnly: true };
  const [stats, retrospect, featuredQuote, bookmark] = await Promise.all([
    getUserStats(profile.id),
    fetchRetrospectData(profile.id, publicOnly),
    fetchFeaturedQuote(profile.featured_entry_id, publicOnly),
    fetchFeaturedBookmark(profile.bookmark_user_book_id, publicOnly),
  ]);

  // 친구의 읽기 통계(기간·문장 수)는 본인 것만 조회 가능해 비워 둔다 — 펼친 책이 그 행을 생략한다
  const shelfHref = `/protected/social/u/${slug}/books`;
  const bookHref = (bookId: string) => `${shelfHref}/${bookId}`;
  const shelfBooks = userBooks
    .slice(0, PROFILE_SHELF_LIMIT)
    .map((ub) => toShelfBook(ub, null, bookHref(ub.book_id)));
  const finishedBooks = retrospect?.finishedBooks ?? [];

  return (
    <div className="pb-16">
      <header className="mb-6 flex items-center">
        <BackButton />
        <h1 className="ml-4 text-page-title text-ink">친구 프로필</h1>
      </header>
      <AnimatedSection>
        <ProfileBook
          user={user}
          profile={profile}
          stats={stats}
          monthly={retrospect?.monthly ?? []}
          featuredQuote={featuredQuote}
          bookmark={bookmark}
          bookmarkHref={bookmark ? bookHref(bookmark.bookId) : null}
          isFriend
        />
        <ProfileShelf
          books={shelfBooks}
          total={userBooks.length}
          shelfHref={shelfHref}
          isOwnProfile={false}
        />
        <ProfileExcerpts books={finishedBooks} hrefFor={bookHref} />
      </AnimatedSection>
    </div>
  );
}
