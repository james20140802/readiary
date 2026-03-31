'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedListSection from '@/components/ui/AnimatedListSecion';
import SocialFeedItem from './SocialFeedItem';
import { SocialFeedEntry } from '@/types/entry';
import Button from '@/components/ui/Button';
import { Users } from 'lucide-react';
import Link from 'next/link';
import Card from '@/components/ui/Card';

interface Props {
  feed: SocialFeedEntry[];
}

export default function SocialFeed({ feed }: Props) {
  const [visibleCount, setVisibleCount] = useState(3);
  const router = useRouter();

  const visibleFeed = feed.slice(0, visibleCount);
  const hasMore = feed.length > visibleCount;

  const handleButtonClick = () => {
    if (hasMore) {
      setVisibleCount((prev) => prev + 5);
    } else {
      router.push('/protected/social');
    }
  };

  return (
    <section className="mt-8 mb-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-section-title text-label dark:text-label-invert">👥 소셜 피드</h2>
        <Link
          href="/protected/social"
          className="text-caption font-semibold text-tint hover:text-tint-hover transition-colors"
        >
          전체보기 →
        </Link>
      </div>

      {/* 피드 없을 때 empty state */}
      {feed.length === 0 ? (
        <Card
          hoverable={false}
          className="flex flex-col items-center justify-center py-12 gap-2 text-center"
        >
          <Users size={28} className="text-label-muted" />
          <p className="text-body font-semibold text-label dark:text-label-invert">
            아직 친구 활동이 없어요
          </p>
          <p className="text-caption text-label-muted">친구를 추가하면 피드가 채워져요!</p>
          <Link
            href="/protected/social?tab=friends"
            className="mt-2 text-caption font-semibold text-tint hover:text-tint-hover"
          >
            친구 찾기 →
          </Link>
        </Card>
      ) : (
        <>
          <AnimatedListSection>
            {visibleFeed.map((item) => (
              <SocialFeedItem key={item.entry.id} {...item} />
            ))}
          </AnimatedListSection>

          <div className="mt-3 flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleButtonClick}
              className="w-full h-9"
            >
              {hasMore ? '활동 더 보기 ↓' : '전체 기록 보러가기 →'}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
