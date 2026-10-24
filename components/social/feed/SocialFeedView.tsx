'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import clsx from 'clsx';
import type { DetailSocialFeedEntry } from '@/types/entry';
import type { Friend } from '@/types/friends';
import Button from '@/components/ui/Button';
import { LargeTitle } from '@/components/shell/LargeTitle';
import { TopBarActions, useTopBar } from '@/components/shell/TopBarContext';
import { friendsReadingFrom } from '@/components/social/feedFormat';
import FeedPost from './FeedPost';
import { FriendsReadingList, FriendsReadingStrip } from './FriendsReading';
import FriendRequestNotice from './FriendRequestNotice';
import styles from './feed.module.css';

export interface SocialFeedViewProps {
  initialFeed: DetailSocialFeedEntry[];
  userId: string;
  /** 서버가 정한 기준 시각(ISO) — 날 표시가 서버·클라이언트에서 같게 */
  referenceTime: string;
  pendingFriends: Friend[];
  friendCount: number;
  pageSize: number;
  /** 다음 쪽을 불러온다(page는 0부터). 없으면 첫 쪽만 보인다 */
  loadPage?: (page: number, limit: number) => Promise<DetailSocialFeedEntry[]>;
}

const FRIENDS_HREF = '/social/friends';

/**
 * 친구의 문장 — 친구가 친구에게 보이게 남긴 문장이 이어지는 피드.
 * 모바일은 한 화면씩 끊지 않고 글마다 가볍게 멈추고(스펙 2.5), 데스크톱은 글 흐름 옆에 친구들이 읽는 책을 둔다.
 */
export default function SocialFeedView({
  initialFeed,
  userId,
  referenceTime,
  pendingFriends,
  friendCount,
  pageSize,
  loadPage,
}: SocialFeedViewProps) {
  useTopBar({ title: '친구의 문장', brand: false });
  const now = useMemo(() => new Date(referenceTime), [referenceTime]);

  const [feed, setFeed] = useState(initialFeed);
  const canLoad = Boolean(loadPage) && initialFeed.length >= pageSize;
  const [hasMore, setHasMore] = useState(canLoad);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // 페이지 번호·진행 상태는 화면을 다시 그릴 필요가 없어 ref로만 센다
  const pageRef = useRef(1);
  const hasMoreRef = useRef(canLoad);
  const loadingRef = useRef(false);
  const errorRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!loadPage || loadingRef.current || !hasMoreRef.current || errorRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const next = await loadPage(pageRef.current, pageSize);
      if (next.length < pageSize) {
        hasMoreRef.current = false;
        setHasMore(false);
      }
      pageRef.current += 1;
      setFeed((prev) => {
        const ids = new Set(prev.map((i) => i.entry.id));
        return [...prev, ...next.filter((i) => !ids.has(i.entry.id))];
      });
    } catch {
      errorRef.current = true;
      setLoadError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [loadPage, pageSize]);

  const { ref: observeSentinel } = useInView({
    rootMargin: '0px 0px 600px 0px',
    onChange: (inView) => {
      if (inView) void loadMore();
    },
  });
  const setSentinel = (node: HTMLDivElement | null) => {
    observeSentinel(node);
    sentinelRef.current = node;
  };

  // 새 쪽을 그린 뒤에도 바닥 표식이 여전히 화면 안이면 관찰자는 다시 알려주지 않는다 — 다음 프레임에 직접 잰다
  useEffect(() => {
    if (loading || !hasMore || loadError) return;
    const frame = requestAnimationFrame(() => {
      const el = sentinelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 600 && rect.bottom > 0) void loadMore();
    });
    return () => cancelAnimationFrame(frame);
  }, [feed, loading, hasMore, loadError, loadMore]);

  const reading = useMemo(() => friendsReadingFrom(feed, now), [feed, now]);

  return (
    <div className={clsx(styles.feed, 'relative')}>
      <div aria-hidden className={styles.marginLine} />
      <TopBarActions>
        <Link
          href={FRIENDS_HREF}
          aria-label={
            pendingFriends.length > 0 ? `친구, 받은 신청 ${pendingFriends.length}` : '친구'
          }
          className="relative grid h-11 w-11 place-items-center rounded-full text-ink"
        >
          <UserPlus size={23} strokeWidth={1.75} aria-hidden />
          {pendingFriends.length > 0 && <span className="topbar-dot" aria-hidden />}
        </Link>
      </TopBarActions>

      <div className={clsx(styles.wide, 'relative z-[1]')}>
        <div className="flex items-center gap-4">
          <div>
            <LargeTitle>소셜</LargeTitle>
          </div>
          <Button asChild size="sm" variant="secondary" className="ml-auto hidden lg:inline-flex">
            <Link href={FRIENDS_HREF}>친구 찾기{friendCount > 0 ? ` · ${friendCount}` : ''}</Link>
          </Button>
        </div>

        <div className="mt-[18px] lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-start lg:gap-14">
          <div>
            <FriendsReadingStrip list={reading} />
            <FriendRequestNotice
              pending={pendingFriends}
              friendCount={friendCount}
              variant="strip"
              className="mb-[26px] mt-[18px]"
            />

            {feed.length === 0 ? (
              <EmptyFeed friendCount={friendCount} />
            ) : (
              <div className="mt-6 flex flex-col gap-9 lg:mt-0 lg:gap-[34px]">
                {feed.map((item, i) => (
                  <FeedPost key={item.entry.id} item={item} userId={userId} now={now} index={i} />
                ))}
              </div>
            )}

            {loadError && (
              <div role="alert" className="mt-8 flex items-center gap-3 font-sans text-body-sm">
                <span className="text-ink-sub">다음 문장을 불러오지 못했어요.</span>
                <button
                  type="button"
                  className="min-h-11 font-semibold text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                  onClick={() => {
                    errorRef.current = false;
                    setLoadError(false);
                    void loadMore();
                  }}
                >
                  다시 불러오기
                </button>
              </div>
            )}

            {hasMore && (
              <div ref={setSentinel} className="mt-9">
                {loading && (
                  <div
                    role="status"
                    aria-label="다음 문장을 불러오는 중"
                    className="vellum h-40 rounded-[3px] motion-safe:animate-pulse"
                  />
                )}
              </div>
            )}

            {!hasMore && feed.length > 0 && (
              <div className="mt-11 flex items-center justify-between gap-3 border-t border-hairline pt-[22px] font-sans text-[15px] font-medium text-ink-sub">
                <p>친구의 문장을 다 읽었어요</p>
                <Button asChild size="sm" variant="secondary">
                  <Link href={FRIENDS_HREF}>친구 찾기</Link>
                </Button>
              </div>
            )}
          </div>

          <aside className="sticky top-10 hidden space-y-[26px] lg:block" aria-label="친구 소식">
            <FriendsReadingList list={reading} />
            <FriendRequestNotice
              pending={pendingFriends}
              friendCount={friendCount}
              variant="card"
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

function EmptyFeed({ friendCount }: { friendCount: number }) {
  return (
    <div className="mt-10 border-t border-hairline pt-8">
      <p className="font-serif text-[22px] font-semibold leading-[1.5] text-ink">
        {friendCount === 0
          ? '함께 읽을 친구를 찾아보세요.'
          : '친구들이 아직 문장을 남기지 않았어요.'}
      </p>
      <p className="mt-2 font-sans text-body-sm text-ink-sub">
        친구가 &lsquo;친구에게 보임&rsquo;으로 남긴 문장과 생각이 여기에 이어져요.
      </p>
      <Button asChild size="sm" className="mt-6">
        <Link href={FRIENDS_HREF}>{friendCount === 0 ? '친구 찾기' : '친구 더 찾기'}</Link>
      </Button>
    </div>
  );
}
