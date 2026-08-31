'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import Modal from '@/components/ui/Modal';
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
                'relative aspect-square flex-col rounded-[2px] border border-hairline p-4 text-left shadow-[1px_2px_6px_rgba(62,58,52,0.12)] transition-transform duration-200 hover:-translate-y-1 hover:rotate-0',
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
                <span aria-hidden className="font-serif text-[22px] leading-none text-accent">
                  “
                </span>
                {n.kind === 'friend' && <Seal className="text-[10px]">친구</Seal>}
              </div>
              <p className="mt-1 line-clamp-4 flex-1 font-serif text-[13px] leading-relaxed text-ink">
                {text}
              </p>
              <div className="mt-2">
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

      <Modal isOpen={active != null} onClose={() => setActive(null)}>
        {active && (
          <>
            <Seal className="mb-3 block">
              {active.kind === 'friend' ? `친구 · ${active.friendName ?? ''}` : '내 기록'}
            </Seal>
            {active.quote ? (
              <>
                <span
                  aria-hidden
                  className="mb-2 block font-serif text-[40px] leading-none text-accent"
                >
                  “
                </span>
                {/* 긴 글은 모달에서 다 보여주지 않는다 — 잘린 만큼은 "자세히"로 */}
                <blockquote className="line-clamp-6 font-serif text-quote text-ink">
                  {active.quote}
                </blockquote>
                {active.note && (
                  <div className="mt-4 border-t border-hairline pt-3">
                    <p className="mb-1 text-caption text-ink-faint">남긴 생각</p>
                    <p className="line-clamp-3 font-serif text-[14px] leading-relaxed text-ink-sub">
                      {active.note}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="line-clamp-6 font-serif text-quote text-ink">{active.note}</p>
            )}
            <div className="mt-[18px] flex items-baseline justify-between gap-3 border-t border-hairline pt-[14px]">
              <div className="min-w-0">
                <span className="font-serif text-[13px] font-bold text-ink">
                  {active.bookTitle}
                </span>
                <span className="ml-2 text-caption text-ink-faint">
                  {[active.bookAuthor, formatDate(active.date)].filter(Boolean).join(' · ')}
                </span>
              </div>
              <Link href={active.href} className="shrink-0 text-[13px] text-accent">
                자세히 →
              </Link>
            </div>
          </>
        )}
      </Modal>
    </section>
  );
}
