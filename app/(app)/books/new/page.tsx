'use client';

import { useState } from 'react';
import NewBookForm from './_components/NewBookForm';
import KakaoBookSearchForm from './_components/KakaoBookSearchForm';
import { LargeTitle } from '@/components/shell/LargeTitle';
import { TopBarActions, useTopBar } from '@/components/shell/TopBarContext';
import { NewBookTabs, type NewBookTab } from '@/components/books/BookNewParts';

/** 책 등록 — 시안 book-new.html. 도구 화면이라 장 넘김 없이 흐른다 */
export default function NewBookPage() {
  useTopBar({ title: '책 등록', back: { href: '/books', label: '책장' } });
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<NewBookTab>('search');

  return (
    <div className="w-full max-w-[1040px]">
      {/* 시안처럼 상단 바 오른쪽을 비운다(찾기·알림 기본 버튼 숨김) */}
      <TopBarActions>{null}</TopBarActions>
      <LargeTitle>책 등록</LargeTitle>
      <NewBookTabs value={tab} onChange={setTab} disabled={busy} />
      <div key={tab}>
        {tab === 'search' ? (
          <KakaoBookSearchForm onBusyChange={setBusy} />
        ) : (
          <NewBookForm onBusyChange={setBusy} />
        )}
      </div>
    </div>
  );
}
