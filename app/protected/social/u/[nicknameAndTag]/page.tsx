import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { getUserStats } from '@/lib/stats/getUserStats';
import { fetchProfileData } from '@/lib/profile/fetchProfileData';
import { toShelfBook } from '@/lib/books/shelfBook';
import ProfileCover from '@/components/profile/ProfileCover';
import ProfileShelf, { PROFILE_SHELF_LIMIT } from '@/components/profile/ProfileShelf';
import ProfileColophon from '@/components/profile/ProfileColophon';
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

  const stats = await getUserStats(profile.id);

  // 친구의 읽기 통계(기간·문장 수)는 본인 것만 조회 가능해 비워 둔다 — 펼친 책이 그 행을 생략한다
  const shelfHref = `/protected/social/u/${slug}/books`;
  const shelfBooks = userBooks
    .slice(0, PROFILE_SHELF_LIMIT)
    .map((ub) => toShelfBook(ub, null, `${shelfHref}/${ub.book_id}`));

  return (
    <div className="pb-16">
      <header className="mb-6 flex items-center">
        <BackButton />
        <h1 className="ml-4 text-page-title text-ink">친구 프로필</h1>
      </header>
      <AnimatedSection>
        <ProfileCover user={user} profile={profile} isFriend />
        <ProfileShelf
          books={shelfBooks}
          total={userBooks.length}
          shelfHref={shelfHref}
          isOwnProfile={false}
        />
        {stats ? (
          <ProfileColophon stats={stats} />
        ) : (
          <p className="mt-12 text-body-sm text-ink-faint">통계 정보를 불러올 수 없습니다.</p>
        )}
      </AnimatedSection>
    </div>
  );
}
