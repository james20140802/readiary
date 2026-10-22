'use client';

import Pile from '@/components/ui/Pile';
import { useTopBar } from '@/components/shell/TopBarContext';
import {
  DesktopLeaf,
  DesktopLeaves,
  Leaf,
  LeafStack,
  LeafSwitch,
  Leaves,
} from '@/components/shell/Leaves';

// 문구는 시안 home2.html(오늘·읽던 책)과 entry-layer.html(그때의 생각·덧붙인 생각)에서 가져왔다.
const QUOTE = '가진 것을 잃을까 두려운 마음이 나를 가장 많이 붙잡고 있었다.';
const OLD_QUOTE = '경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.';
const THEN_NOTE = '가까워질수록 모르는 부분이 줄어드는 게 꼭 좋은 걸까.';
const SLIPS = [
  { id: 's1', date: '20일 뒤 · 오늘', note: '모르는 채로 남겨 두는 것도 존중일지 모른다.' },
  { id: 's2', date: '이틀 뒤 · 9월 18일', note: '이 문장을 친구에게 보냈다.' },
  { id: 's3', date: '한 달 뒤 · 10월 16일', note: '그때는 아쉬웠는데, 지금은 홀가분하다.' },
];
const BOOKS = [
  { title: '소유냐 존재냐', meta: '184 / 352 · 오늘 이어 읽는 중' },
  { title: '철학이 깊을수록 삶은 단순하다', meta: '42쪽 · 이틀 전' },
  { title: '리만 가설', meta: '읽는 중 · 일주일 전' },
];

const DESKTOP_ITEMS = [
  { id: 'lab-today', label: '오늘' },
  { id: 'lab-then', label: '그때의 생각' },
  { id: 'lab-books', label: '읽던 책' },
];

function TodayBody() {
  return (
    <>
      <div className="flex items-end gap-4">
        <span className="font-serif text-page-title-lg text-ink">22</span>
        <div>
          <div className="font-sans text-section-title text-ink">10월</div>
          <div className="mt-1 font-sans text-caption text-ink-sub">목요일</div>
        </div>
      </div>
      <p className="mt-6 font-serif text-quote text-ink">{QUOTE}</p>
      <div className="mt-3 font-sans text-caption text-ink-sub">소유냐 존재냐 · 오늘</div>
    </>
  );
}

function ThenBody() {
  return (
    <>
      <div className="font-sans text-overline text-ink-sub">20일 전 · 9월 16일</div>
      <p className="mt-3 font-serif text-quote text-ink">{OLD_QUOTE}</p>
      <div className="mt-6 font-sans text-overline text-ink-sub">그때의 생각 · 9월 16일</div>
      <p className="mt-2 font-serif text-note text-ink">{THEN_NOTE}</p>
    </>
  );
}

function BooksBody() {
  return (
    <>
      <h2 className="font-sans text-section-title text-ink">읽던 책</h2>
      <ul className="mt-4">
        {BOOKS.map((b) => (
          <li key={b.title} className="border-t border-hairline py-3">
            <div className="font-serif text-[17px] font-semibold text-ink">{b.title}</div>
            <div className="mt-0.5 font-sans text-caption text-ink-sub">{b.meta}</div>
          </li>
        ))}
      </ul>
    </>
  );
}

function ThoughtPile() {
  return (
    <Pile
      items={SLIPS}
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

export default function LeavesDemo() {
  useTopBar({ title: '장 넘김 견본', back: { href: '/design-lab', label: '견본' } });

  return (
    <>
      <Leaves>
        <LeafStack>
          <Leaf title="오늘">
            <TodayBody />
          </Leaf>
          <Leaf title="그때의 생각">
            <ThenBody />
          </Leaf>
          <Leaf title="덧붙인 생각" vellum>
            <h2 className="mb-4 font-sans text-section-title text-ink">덧붙인 생각</h2>
            <ThoughtPile />
          </Leaf>
        </LeafStack>
        <Leaf title="읽던 책" vellum free>
          <BooksBody />
        </Leaf>
      </Leaves>

      <LeafSwitch label="견본 보기" items={DESKTOP_ITEMS} />
      <DesktopLeaves>
        <DesktopLeaf id="lab-today">
          <div className="mx-auto max-w-xl px-8 py-24">
            <TodayBody />
          </div>
        </DesktopLeaf>
        <DesktopLeaf id="lab-then">
          <div className="mx-auto max-w-xl px-8 py-24">
            <ThenBody />
            <div className="mt-8">
              <ThoughtPile />
            </div>
          </div>
        </DesktopLeaf>
        <DesktopLeaf id="lab-books">
          <div className="mx-auto max-w-xl px-8 py-24">
            <BooksBody />
          </div>
        </DesktopLeaf>
      </DesktopLeaves>
    </>
  );
}
