'use client';

import { SkeletonScope } from '@/components/ui/Skeleton';
import { LargeTitle } from '@/components/shell/LargeTitle';
import { TopBarActions, useTopBar } from '@/components/shell/TopBarContext';
import { NewBookTabs, SearchBox } from './BookNewParts';

const noop = () => {};

/**
 * 책 등록을 펼치는 동안 — 이 화면은 가져오는 데이터가 없어(찾기 전까지는 빈 검색창뿐)
 * 실제 처음 모습을 그대로 그린다. 탭은 아직 누르지 못하게 잠긴다.
 */
export default function BookNewSkeleton() {
  useTopBar({ title: '책 등록', back: { href: '/books', label: '책장' } });
  return (
    <SkeletonScope label="책 등록을 여는 중">
      <div className="w-full max-w-[1040px]">
        <TopBarActions>{null}</TopBarActions>
        <LargeTitle>책 등록</LargeTitle>
        <NewBookTabs value="search" onChange={noop} disabled />
        <SearchBox value="" onChange={noop} onSubmit={noop} />
      </div>
    </SkeletonScope>
  );
}
