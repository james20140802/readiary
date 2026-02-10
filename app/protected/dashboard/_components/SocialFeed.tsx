'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedListSection from '@/components/ui/AnimatedListSecion';
import SocialFeedItem from './SocialFeedItem';
import { SocialFeedEntry } from '@/types/entry';
import Button from '@/components/ui/Button';

interface Props {
  feed: SocialFeedEntry[];
}

export default function SocialFeed({ feed }: Props) {
  const [visibleCount, setVisibleCount] = useState(3);
  const router = useRouter();

  // 현재 보여줄 데이터 슬라이싱
  const visibleFeed = feed.slice(0, visibleCount);
  // 아직 더 보여줄 데이터가 있는지 여부
  const hasMore = feed.length > visibleCount;

  const handleButtonClick = () => {
    if (hasMore) {
      // 데이터가 더 있으면 5개씩 추가 노출
      setVisibleCount((prev) => prev + 5);
    } else {
      // 데이터를 다 보여줬으면 전체 피드 페이지로 이동
      router.push('/protected/social');
    }
  };

  return (
    <section className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-section-title text-label dark:text-white">👥 소셜 피드</h2>
        {/* 우측 상단에도 작게 이동 링크를 두어 편의성을 높입니다 */}
        <button
          onClick={() => router.push('/protected/social')}
          className="text-xs text-secondary hover:text-tint transition-colors"
        >
          전체보기 →
        </button>
      </div>

      <AnimatedListSection>
        {feed.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            친구들의 활동이 아직 없어요.
          </div>
        ) : (
          visibleFeed.map((item) => <SocialFeedItem key={item.entry.id} {...item} />)
        )}
      </AnimatedListSection>

      {/* 버튼 영역: 피드가 있을 때만 표시 */}
      {feed.length > 0 && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleButtonClick}
            className="w-full max-w-xs h-9"
          >
            {hasMore ? <>활동 더 보기 ↓</> : <>전체 기록 보러가기 →</>}
          </Button>
        </div>
      )}
    </section>
  );
}
