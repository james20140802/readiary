'use client';

import { useState } from 'react';
import { LargeTitle } from '@/components/shell/LargeTitle';
import { TopBarActions, useTopBar } from '@/components/shell/TopBarContext';
import {
  ChosenBook,
  LineField,
  NewBookTabs,
  ResultRow,
  SearchBox,
  type NewBookTab,
  type ResultBook,
} from '@/components/books/BookNewParts';
import { BTN_INK } from '@/components/books/buttonStyles';

const RESULTS: ResultBook[] = [
  {
    key: '1',
    title: '에로스의 종말',
    authors: '한병철 · 김태환 옮김',
    meta: '문학과지성사 · 2015',
    coverUrl: null,
  },
  {
    key: '2',
    title: '에로스의 종말 (개정판)',
    authors: '한병철',
    meta: '문학과지성사 · 2024',
    coverUrl: null,
  },
  {
    key: '3',
    title: '에로스와 문명',
    authors: '허버트 마르쿠제',
    meta: '나남 · 2004',
    coverUrl: null,
  },
];

/** 견본: 실제 폼과 같은 부품을 견본 상태로만 움직인다(저장·검색 없음) */
export default function LabBookNew({ state }: { state: string }) {
  useTopBar({ title: '책 등록', back: { href: '/design-lab/books', label: '책장' } });
  const [tab, setTab] = useState<NewBookTab>(state === 'manual' ? 'manual' : 'search');
  const [query, setQuery] = useState(state === 'empty' ? '없는 책' : '에로스의 종말');
  const [picked, setPicked] = useState(RESULTS[0].key);
  const [pages, setPages] = useState('148');
  const chosen = RESULTS.find((r) => r.key === picked)!;

  return (
    <div className="w-full max-w-[1040px]">
      {/* 시안처럼 상단 바 오른쪽을 비운다(찾기·알림 기본 버튼 숨김) */}
      <TopBarActions>{null}</TopBarActions>
      <LargeTitle>책 등록</LargeTitle>
      <NewBookTabs value={tab} onChange={setTab} />
      {tab === 'search' ? (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-14">
          <section aria-label="책 찾기">
            <SearchBox value={query} onChange={setQuery} onSubmit={() => {}} />
            <div className="mt-3.5">
              {state === 'empty' ? (
                <p className="py-8 font-serif text-note text-ink-sub">
                  맞는 책이 없어요. 다른 낱말로 찾거나 직접 적어 꽂을 수 있어요.
                </p>
              ) : (
                RESULTS.map((r) => (
                  <ResultRow
                    key={r.key}
                    book={r}
                    pressed={r.key === picked}
                    onClick={() => setPicked(r.key)}
                  />
                ))
              )}
            </div>
          </section>
          {state !== 'empty' && (
            <ChosenBook
              title={chosen.title}
              author={chosen.authors}
              coverUrl={chosen.coverUrl}
              footer={
                <button type="button" className={`${BTN_INK} w-full`}>
                  책장에 꽂기
                </button>
              }
            >
              <LineField
                className="!mt-3"
                label="전체 쪽수"
                inputMode="numeric"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                hint="책 정보에서 가져왔어요. 고쳐도 돼요."
              />
            </ChosenBook>
          )}
        </div>
      ) : (
        <form className="max-w-[560px]" onSubmit={(e) => e.preventDefault()}>
          <LineField label="제목" placeholder="책 제목" required />
          <LineField label="지은이" placeholder="지은이" required />
          <LineField
            label="전체 쪽수"
            inputMode="numeric"
            placeholder="선택"
            hint="모르면 비워 두세요. 전자책·오디오북도 기록할 수 있어요."
          />
          <button type="submit" className={`${BTN_INK} mt-7 w-full lg:w-auto`}>
            책장에 꽂기
          </button>
        </form>
      )}
    </div>
  );
}
