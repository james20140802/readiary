import { MyMonthlyExcerptArchive } from '@/components/monthly-excerpt/MonthlyExcerptArchive';
import { fetchMyExcerptYear, fetchMyExcerptYears } from '@/lib/monthly-excerpt/server';

/**
 * 내 달의 발췌집 모아 보기. 해 목록을 불러오지 못하면 error.tsx가 받는다(비어 있는 것으로 오해하지 않게).
 * 첫 해만 서버에서 그리고 나머지 해는 펼칠 때 가져온다. 첫 해의 달만 실패하면 그 해 안에서 다시 시도하게 한다.
 */
export default async function ExcerptsPage() {
  const years = await fetchMyExcerptYears();
  const firstYearMonths = years[0] ? await fetchMyExcerptYear(years[0].year).catch(() => null) : [];

  return <MyMonthlyExcerptArchive years={years} firstYearMonths={firstYearMonths} />;
}
