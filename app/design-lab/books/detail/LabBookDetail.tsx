'use client';

import { ReflectionFeatureContext } from '@/components/features/ReflectionFeatureProvider';
import BookDetailContent from '@/components/books/BookDetailContent';
import { labBook } from '../fixtures';

/** 견본에는 앱 레이아웃의 덧붙인 생각 기능 공급자가 없어 여기서 켠다(조회 없음) */
export default function LabBookDetail({ state }: { state: string }) {
  const { userBook, entries } = labBook({
    finished: state === 'finished',
    noTotal: state === 'nototal',
    empty: state === 'empty',
  });
  return (
    <ReflectionFeatureContext.Provider value={true}>
      <BookDetailContent userBook={userBook} entries={entries} userId="lab-user" />
    </ReflectionFeatureContext.Provider>
  );
}
