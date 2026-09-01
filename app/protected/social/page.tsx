// app/protected/social/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell, Users } from 'lucide-react';
import { fetchDetailSocialFeedEntries } from '@/lib/queries/fetchSocialFeedEntries';
import { fetchFriendList, fetchReceivedFriendRequests } from '@/lib/friends/fetchFriendList';
import { FEED_PAGINATION_LIMIT } from '@/constants/social';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchUnreadNotificationCount } from '@/lib/notifications/fetchNotifications';
import DetailSocailFeedList from './_components/DetailSocialFeedList';

interface SocialPageProps {
  searchParams: Promise<{ invite?: string }>;
}

export default async function SocialPage({ searchParams }: SocialPageProps) {
  const { invite } = await searchParams;
  // 초대 링크는 친구 페이지가 담당한다
  if (invite) redirect(`/protected/social/friends?invite=${encodeURIComponent(invite)}`);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [feed, acceptedFriends, pendingFriends, unreadCount] = await Promise.all([
    fetchDetailSocialFeedEntries(0, FEED_PAGINATION_LIMIT),
    fetchFriendList(),
    fetchReceivedFriendRequests(),
    fetchUnreadNotificationCount(),
  ]);

  const friendCount = acceptedFriends?.length ?? 0;
  const pendingCount = pendingFriends?.length ?? 0;

  return (
    <div className="space-y-4">
      <header className="px-1 flex items-center justify-between">
        <h1 className="text-page-title text-ink">소셜</h1>
        {/* 데스크톱(md+)은 상단 GNB의 종이 담당 — 모바일에서만 페이지 헤더에 노출 */}
        <Link
          href="/protected/social/notifications"
          className="relative p-2 -mr-2 text-ink-sub md:hidden"
          aria-label="알림"
        >
          <Bell size={20} strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-[7px] w-[7px] rounded-full bg-accent">
              <span className="sr-only">읽지 않은 알림 있음</span>
            </span>
          )}
        </Link>
      </header>

      <Link
        href="/protected/social/friends"
        className="block px-1 text-caption text-ink-faint hover:text-ink transition-colors"
      >
        친구 {friendCount}명
        {pendingCount > 0 && (
          <span className="text-accent font-medium"> · 받은 요청 {pendingCount}</span>
        )}
        {' →'}
      </Link>

      {feed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border-2 border-dashed border-hairline rounded-2xl">
          <Users size={32} className="text-ink-faint" />
          <p className="text-body-sm font-medium text-ink">친구들의 활동이 아직 없어요</p>
          <p className="text-caption text-ink-faint">친구를 추가하면 피드가 채워져요</p>
          <Link
            href="/protected/social/friends"
            className="mt-1 text-caption font-semibold text-accent bg-accent-soft px-3 py-1.5 rounded-full border border-accent/20"
          >
            친구 찾기
          </Link>
        </div>
      ) : (
        <DetailSocailFeedList initialFeed={feed} userId={user.id} />
      )}
    </div>
  );
}
