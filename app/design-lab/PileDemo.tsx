'use client';

import Pile from '@/components/ui/Pile';

interface Thought {
  id: string;
  date: string;
  note: string;
}

// 시안(entry-layer.html)의 덧붙인 생각 문구. 앞의 둘은 시안 그대로, 나머지는 같은 말투로 더했다.
const THOUGHTS: Thought[] = [
  { id: 't1', date: '20일 뒤 · 오늘', note: '모르는 채로 남겨 두는 것도 존중일지 모른다.' },
  { id: 't2', date: '이틀 뒤 · 9월 18일', note: '이 문장을 친구에게 보냈다.' },
  {
    id: 't3',
    date: '한 달 뒤 · 10월 16일',
    note: '그때는 환상이 사라지는 게 아쉬웠는데, 지금은 홀가분하다.',
  },
  { id: 't4', date: '석 달 뒤 · 12월 16일', note: '다시 읽으니 문턱이라는 말이 먼저 걸린다.' },
  {
    id: 't5',
    date: '반 년 뒤 · 3월 16일',
    note: '이 문장 덕분에 낯선 사람 앞에서 덜 긴장하게 됐다.',
  },
];

export default function PileDemo() {
  return (
    <Pile
      items={THOUGHTS}
      getKey={(t) => t.id}
      label="덧붙인 생각 묶음"
      nextLabel="다음 생각"
      renderSlip={(t) => (
        <div>
          <div className="font-sans text-fine font-semibold text-ink-sub">{t.date}</div>
          <p className="mt-1 font-serif text-note text-ink">{t.note}</p>
        </div>
      )}
    />
  );
}
