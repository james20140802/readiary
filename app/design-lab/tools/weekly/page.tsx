import type { Metadata } from 'next';
import WeeklyRecords from '@/components/notifications/WeeklyRecords';
import type { WeeklyEntry } from '@/components/notifications/WeeklyTimeline';
import { labGuard, LAB_ROBOTS } from '../guard';

export const metadata: Metadata = { title: '이번 주의 기록 견본', robots: LAB_ROBOTS };

const book = (title: string) => ({ books: { title } });
const ENTRIES: WeeklyEntry[] = [
  {
    id: 'w1',
    date: '2026-10-22',
    is_private: false,
    quote: '가진 것을 잃을까 두려운 마음이 나를 가장 많이 붙잡고 있었다.',
    note: '요즘 내가 놓지 못하는 것들의 목록을 적어 봤다.',
    user_books: book('소유냐 존재냐'),
  },
  {
    id: 'w2',
    date: '2026-10-22',
    is_private: true,
    quote: '경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.',
    note: null,
    user_books: book('에로스의 종말'),
  },
  {
    id: 'w3',
    date: '2026-10-19',
    is_private: false,
    quote: null,
    note: '질문을 바꾸면 같은 하루도 다른 얼굴을 한다는 말이 오늘 하루 종일 맴돌았다.',
    user_books: book('철학이 깊을수록 삶은 단순하다'),
  },
  {
    id: 'w4',
    date: '2026-10-17',
    is_private: false,
    quote: null,
    note: null,
    user_books: book('리만 가설'),
  },
];

export default async function WeeklyLabPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  labGuard();
  const { state } = await searchParams;
  return (
    <WeeklyRecords
      entries={state === 'empty' || state === 'failed' ? [] : ENTRIES}
      failed={state === 'failed'}
      period="2026. 10. 16. — 10. 23."
    />
  );
}
