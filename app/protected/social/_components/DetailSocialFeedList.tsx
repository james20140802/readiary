'use client';

import { useRef, useState } from 'react';
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
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // 페이지 번호·in-flight·뷰포트 상태는 화면을 다시 그릴 필요가 없어 ref로만 추적
  const pageRef = useRef(1); // 다음 불러올 페이지 번호
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const inViewRef = useRef(false);

  const loadMoreData = async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const nextData = await fetchDetailSocialFeedEntries(pageRef.current, FEED_PAGINATION_LIMIT);

    if (nextData.length === 0) {
      hasMoreRef.current = false;
      setHasMore(false);
    } else {
      pageRef.current += 1;
      setFeed((prev) => [...prev, ...nextData]);
    }

    loadingRef.current = false;
    setLoading(false);

    // 페이지가 짧아 로드 후에도 센티널이 여전히 뷰포트 안에 있으면 브라우저의
    // IntersectionObserver는 상태 변화가 없는 한 다시 알려주지 않으므로 직접 재확인한다.
    if (inViewRef.current && hasMoreRef.current) {
      loadMoreData();
    }
  };

  const { ref } = useInView({
    onChange: (nextInView) => {
      inViewRef.current = nextInView;
      if (nextInView && hasMoreRef.current && !loadingRef.current) loadMoreData();
    },
  });

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

      {/* 바닥 감지 영역 */}
      {hasMore && (
        <div ref={ref} className="h-20 flex items-center justify-center">
          {loading && (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
          )}
        </div>
      )}
    </>
  );
}
