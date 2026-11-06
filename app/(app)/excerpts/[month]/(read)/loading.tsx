import MonthlyExcerptSkeleton from '@/components/monthly-excerpt/MonthlyExcerptSkeleton';

// 이 로딩은 (read) 묶음 안에 둔다. [month] 바로 아래에 두면 엮기(/compose)로 갈 때도
// 바깥 경계인 이 발췌집 뼈대가 먼저 떠서, 엮기 자신의 ComposeSkeleton이 보이지 않는다.
export default function Loading() {
  return <MonthlyExcerptSkeleton />;
}
