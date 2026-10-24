/**
 * 친구의 서재 견본 — 예시 데이터. `redesign` → `main` 머지 전에 지운다. 프로덕션에서는 열리지 않는다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import FriendLibraryView from '@/components/social/library/FriendLibraryView';
import { SHELF, YUNSEO } from '../fixtures';
import LabFetchStub from '../LabFetchStub';
import LabStates from '../LabStates';

export const metadata: Metadata = { title: '친구의 서재 견본', robots: { index: false } };

export default async function FriendLabPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const empty = state === 'empty';
  const base = '/design-lab/social/friend';
  return (
    <>
      <LabFetchStub />
      <LabStates
        base={base}
        current={state}
        states={[
          { key: '', label: '기본' },
          { key: 'empty', label: '비어 있음' },
          { key: 'error', label: '발췌집 실패' },
        ]}
      />
      <FriendLibraryView
        profile={YUNSEO}
        isOwn={false}
        stats={{ totalBooks: 18, totalEntries: 31, totalPages: 0, finishedBooks: 9 }}
        featuredQuote={
          empty
            ? null
            : {
                entryId: 'e1',
                quote: '질문을 바꾸면 같은 하루도 다른 얼굴을 한다',
                bookTitle: '철학이 깊을수록 삶은 단순하다',
                author: null,
              }
        }
        current={
          empty
            ? null
            : {
                title: '철학이 깊을수록 삶은 단순하다',
                coverUrl: null,
                lastReadPage: 42,
                totalPages: 280,
                href: `${base}#current`,
              }
        }
        sentences={
          empty
            ? []
            : [
                {
                  key: 's1',
                  quote: '질문을 바꾸면 같은 하루도 다른 얼굴을 한다.',
                  meta: '2026년 10월',
                  href: `${base}#s1`,
                },
                {
                  key: 's2',
                  quote: '경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.',
                  meta: '2026년 10월',
                  href: `${base}#s2`,
                },
              ]
        }
        shelfBooks={empty ? [] : SHELF}
        shelfTotal={empty ? 0 : 18}
        shelfHref={`${base}#shelf`}
        excerpts={
          empty
            ? []
            : [
                {
                  bookId: 'x1',
                  title: '왜 나는 너를 사랑하는가',
                  coverUrl: null,
                  quoteCount: 12,
                  href: `${base}#x1`,
                },
                {
                  bookId: 'x2',
                  title: '정의란 무엇인가',
                  coverUrl: null,
                  quoteCount: 9,
                  href: `${base}#x2`,
                },
              ]
        }
        retrospectError={state === 'error'}
      />
    </>
  );
}
