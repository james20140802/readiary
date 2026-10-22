'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { LargeTitle } from '@/components/shell/LargeTitle';
import { useTopBar } from '@/components/shell/TopBarContext';

// 시안(home2.html)의 책 고르기 줄.
const BOOKS = [
  { id: 'b1', title: '소유냐 존재냐', meta: '184 / 352 · 오늘', current: true },
  { id: 'b2', title: '철학이 깊을수록 삶은 단순하다', meta: '42쪽 · 이틀 전', current: false },
  { id: 'b3', title: '리만 가설', meta: '읽는 중 · 일주일 전', current: false },
];

/** 견본 맨 위: 상단 바 제목, 큰 제목, 시트 열기, 장 넘김 견본 링크 */
export default function LabHeader() {
  useTopBar({ title: '토대 견본' });
  const [open, setOpen] = useState(false);

  return (
    <>
      <LargeTitle>토대 견본</LargeTitle>
      <p className="mt-2 font-sans text-body-sm text-ink-sub">
        일기장과 간지의 색·글자·간지 재질·화면 틀을 한곳에서 확인하는 미리보기용 화면입니다.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          책 고르기
        </Button>
        <Link
          href="/design-lab/leaves"
          className="font-sans text-button-sm text-accent underline-offset-4 hover:underline"
        >
          장 넘김 견본 보기
        </Link>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="책 고르기">
        <ul>
          {BOOKS.map((b) => (
            <li key={b.id} className="border-t border-hairline first:border-t-0">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid min-h-14 w-full grid-cols-[1fr_auto] items-center gap-x-3 py-2.5 text-left"
              >
                <span className="font-serif text-[17px] font-semibold text-ink">{b.title}</span>
                {b.current && (
                  <span className="text-accent">
                    <Check size={16} strokeWidth={1.75} aria-hidden />
                    <span className="sr-only">지금 읽는 책</span>
                  </span>
                )}
                <span className="font-sans text-caption text-ink-sub">{b.meta}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
