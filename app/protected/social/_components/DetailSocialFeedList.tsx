'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { DetailSocialFeedEntry } from '@/types/entry';
import { fetchDetailSocialFeedEntries } from '@/lib/queries/fetchSocialFeedEntries';
import { FEED_PAGINATION_LIMIT } from '@/constants/social';
import DetailSocailFeedItem from './DetailSocialFeedItem';
import AnimatedSection from '@/components/ui/AnimatedSection';

export default function DetailSocailFeedList({
  initialFeed,
  userId,
}: {
  initialFeed: DetailSocialFeedEntry[];
  userId: string;
}) {
  const [feed, setFeed] = useState(initialFeed);
  const [hasMore, setHasMore] = useState(initialFeed.length >= FEED_PAGINATION_LIMIT);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // 페이지 번호·in-flight 상태는 화면을 다시 그릴 필요가 없어 ref로만 추적
  const pageRef = useRef(1); // 다음 불러올 페이지 번호
  const hasMoreRef = useRef(initialFeed.length >= FEED_PAGINATION_LIMIT);
  const loadingRef = useRef(false);
  const errorRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMoreData = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current || errorRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const nextData = await fetchDetailSocialFeedEntries(pageRef.current, FEED_PAGINATION_LIMIT);
      if (nextData.length < FEED_PAGINATION_LIMIT) {
        hasMoreRef.current = false;
        setHasMore(false);
      }
      pageRef.current += 1;
      setFeed((prev) => [...prev, ...nextData]);
    } catch {
      errorRef.current = true;
      setLoadError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const { ref: observeSentinel } = useInView({
    onChange: (nextInView) => {
      if (nextInView && hasMoreRef.current && !loadingRef.current) loadMoreData();
    },
  });
  const setSentinel = (node: HTMLDivElement | null) => {
    observeSentinel(node);
    sentinelRef.current = node;
  };

  // 페이지가 짧아 새 페이지를 그린 뒤에도 센티널이 여전히 뷰포트 안이면 브라우저의
  // IntersectionObserver는 상태 변화가 없는 한 다시 알려주지 않는다. 그래서 새 목록이
  // 커밋된 다음 프레임에 센티널 위치를 직접 재서 이어 부른다 — 로드 완료 직후(렌더 전)에
  // 관찰자의 옛 값으로 판단하면 방금 붙인 페이지가 밀어낸 뒤에도 한 페이지를 더 부른다.
  useEffect(() => {
    if (loading || !hasMore || loadError) return;
    const frame = requestAnimationFrame(() => {
      const el = sentinelRef.current;
      if (!el || loadingRef.current || !hasMoreRef.current) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) loadMoreData();
    });
    return () => cancelAnimationFrame(frame);
  }, [feed, loading, hasMore, loadError, loadMoreData]);

  return (
    <>
      {/* 엽서는 한 장씩 — 괘선 대신 간격으로 구분 */}
      <div className="flex flex-col gap-6 py-6">
        {feed.map((item) => (
          <AnimatedSection key={item.entry.id}>
            <DetailSocailFeedItem item={item} userId={userId} />
          </AnimatedSection>
        ))}
      </div>

      {loadError && (
        <div role="alert" className="space-y-2 text-center text-body-sm text-ink-sub">
          <p>다음 기록을 불러오지 못했습니다.</p>
          <button
            className="text-accent underline"
            onClick={() => {
              errorRef.current = false;
              setLoadError(false);
              void loadMoreData();
            }}
          >
            다시 시도
          </button>
        </div>
      )}
      {/* 바닥 감지 영역 */}
      {hasMore && (
        <div ref={setSentinel} className="h-20 flex items-center justify-center">
          {loading && (
            <div
              role="status"
              aria-label="다음 기록을 불러오는 중입니다"
              className="h-16 w-full rounded-2xl bg-hairline/60 motion-safe:animate-pulse"
            />
          )}
        </div>
      )}
    </>
  );
}
