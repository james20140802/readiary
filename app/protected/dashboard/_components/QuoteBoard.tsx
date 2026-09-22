'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import EntryReader from '@/components/entries/EntryReader';
import Seal from '@/components/ui/Seal';

export interface StickyNote {
  id: string;
  kind: 'mine' | 'friend';
  friendName: string | null;
  quote: string | null;
  note: string | null;
  bookTitle: string;
  bookAuthor: string | null;
  date: string; // yyyy-MM-dd
  createdAt: string; // 보드 정렬용
  href: string;
  /** 최신 4개 밖의 것 — 좁은 화면에선 감춘다 (넓은 화면 6개 · 좁은 화면 4개) */
  narrowHidden: boolean;
}

/** 포스트잇의 미세한 기울기 — 손으로 붙인 듯, 위치마다 조금씩 다르게 */
const TILTS = [
  '-rotate-[1.1deg]',
  'rotate-[0.9deg]',
  '-rotate-[0.7deg]',
  'rotate-[1.3deg]',
  '-rotate-[1.4deg]',
  'rotate-[0.6deg]',
];

const formatDate = (d: string) => d.replaceAll('-', '. ') + '.';

/**
 * 최근 문장 보드 — 내 문장과 친구의 문장을 정사각 포스트잇으로 섞어 붙인다.
 * 인용이 있으면 인용만, 없으면 생각을 보여주고, 짚으면 모달로 전문이 떠오른다.
 */
export function QuoteBoard({ notes }: { notes: StickyNote[] }) {
  const [active, setActive] = useState<StickyNote | null>(null);

  if (notes.length === 0) return null;

  return (
    <section>
      <h2 className="text-section-title text-ink mb-3">최근 문장</h2>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        {notes.map((n, i) => {
          const text = n.quote ?? n.note;
          if (text == null) return null;
          return (
            <button
              key={`${n.kind}-${n.id}`}
              type="button"
              onClick={() => setActive(n)}
              className={clsx(
                'relative min-h-56 min-w-0 flex-col rounded-[2px] border border-hairline p-4 text-left shadow-[1px_2px_6px_rgba(62,58,52,0.12)] transition-transform duration-200 hover:-translate-y-1 hover:rotate-0',
                TILTS[i % TILTS.length],
                n.kind === 'friend' ? 'bg-accent-soft' : 'bg-card',
                n.narrowHidden ? 'hidden sm:flex' : 'flex'
              )}
            >
              {/* 위쪽 가운데 반투명 테이프 */}
              <span
                aria-hidden
                className="absolute -top-[7px] left-1/2 h-[14px] w-11 -translate-x-1/2 -rotate-2 border border-ink/10 bg-ink/[0.06]"
              />
              <div className="flex items-start justify-between">
                <span aria-hidden className="font-serif text-quote leading-none text-accent">
                  “
                </span>
                {n.kind === 'friend' && <Seal className="text-caption">친구</Seal>}
              </div>
              <p className="mt-1 line-clamp-4 h-24 flex-none font-serif text-body leading-relaxed text-ink">
                {text}
              </p>
              <div className="mt-auto pt-2">
                <p className="truncate text-caption text-ink-faint">
                  {n.kind === 'friend' && n.friendName ? `${n.friendName} · ` : ''}
                  {n.bookTitle}
                </p>
                <p className="truncate text-caption text-ink-faint">
                  {[n.bookAuthor, formatDate(n.date)].filter(Boolean).join(' · ')}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {active && <EntryReader entryId={active.id} onClose={() => setActive(null)} />}
    </section>
  );
}
