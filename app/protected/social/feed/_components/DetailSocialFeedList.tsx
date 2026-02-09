'use client';

import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { SocialFeedEntry } from '@/types/entry';
import { fetchSocialFeedEntries } from '@/lib/queries/fetchSocialFeedEntries';
import { FEED_PAGINATION_LIMIT } from '@/constants/social';
import DetailSocailFeedItem from './DetailSocialFeedItem';
import AnimatedSection from '@/components/ui/AnimatedSection';

export default function DetailSocailFeedList({ initialFeed }: { initialFeed: SocialFeedEntry[] }) {
  const [feed, setFeed] = useState(initialFeed);
  const [page, setPage] = useState(1); // 다음 불러올 페이지 번호
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadMoreData();
    }
  }, [inView]);

  const loadMoreData = async () => {
    setLoading(true);
    const nextData = await fetchSocialFeedEntries(page, FEED_PAGINATION_LIMIT);

    if (nextData.length === 0) {
      setHasMore(false);
    } else {
      setFeed((prev) => [...prev, ...nextData]);
      setPage((prev) => prev + 1);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {feed.map((item) => (
        <AnimatedSection key={item.entry.id}>
          <DetailSocailFeedItem item={item} />
        </AnimatedSection>
      ))}

      {/* 바닥 감지 영역 */}
      {hasMore && (
        <div ref={ref} className="h-20 flex items-center justify-center">
          {loading && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-tint" />}
        </div>
      )}
    </div>
  );
}
