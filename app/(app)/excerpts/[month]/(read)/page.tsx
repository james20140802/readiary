import { notFound, redirect } from 'next/navigation';
import MonthlyExcerptOwnerView from '@/components/monthly-excerpt/MonthlyExcerptOwnerView';
import { isMonthKey } from '@/lib/monthly-excerpt/month';
import { fetchMyMonthlyExcerpt } from '@/lib/monthly-excerpt/server';

interface Props {
  params: Promise<{ month: string }>;
}

/** 내가 엮은 달을 읽는다. 아직 엮지 않았으면 엮기로 보낸다. 불러오지 못하면 error.tsx가 받는다. */
export default async function MonthlyExcerptPage({ params }: Props) {
  const { month } = await params;
  if (!isMonthKey(month)) notFound();

  const excerpt = await fetchMyMonthlyExcerpt(month);
  if (!excerpt) redirect(`/excerpts/${month}/compose`);

  return <MonthlyExcerptOwnerView excerpt={excerpt} />;
}
