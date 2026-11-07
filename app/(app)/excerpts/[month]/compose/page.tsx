import { notFound } from 'next/navigation';
import ComposeFlow from '@/components/monthly-excerpt/ComposeFlow';
import { pickFromItem } from '@/lib/monthly-excerpt/compose';
import { todayKST } from '@/lib/dates';
import { isFinishedMonth, isMonthKey } from '@/lib/monthly-excerpt/month';
import {
  fetchFirstCandidates,
  fetchMonthBooks,
  fetchMyMonthlyExcerpt,
} from '@/lib/monthly-excerpt/server';

interface Props {
  params: Promise<{ month: string }>;
}

/**
 * 끝난 달을 엮는다(이미 엮었다면 고친다). 끝나지 않은 달과 형식이 틀린 달은 404.
 * 책 칩과 첫 후보는 서로 영향을 주지 않도록 따로 받고, 하나가 실패해도 화면은 그리며 그 부분이 스스로 다시 시도한다.
 * 기존 발췌집을 불러오지 못한 것은 "없음"으로 오해하지 않도록 error.tsx에 맡긴다.
 */
export default async function ComposePage({ params }: Props) {
  const { month } = await params;
  if (!isMonthKey(month) || !isFinishedMonth(month, todayKST())) notFound();

  const [excerpt, books, firstPage] = await Promise.allSettled([
    fetchMyMonthlyExcerpt(month),
    fetchMonthBooks(month),
    fetchFirstCandidates(month),
  ]);
  if (excerpt.status === 'rejected') throw excerpt.reason;

  return (
    <ComposeFlow
      month={month}
      books={books.status === 'fulfilled' ? books.value : null}
      firstPage={firstPage.status === 'fulfilled' ? firstPage.value : null}
      initialPicks={(excerpt.value?.items ?? []).map(pickFromItem)}
      initialIsShared={excerpt.value?.isShared}
    />
  );
}
