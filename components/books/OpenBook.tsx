'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import Seal from '@/components/ui/Seal';
import { spineLayoutId, type ShelfBook } from './BookSpineShelf';

interface Props {
  book: ShelfBook | null;
  onClose: () => void;
}

const FLIP = 0.55; // 표지가 넘어가는 시간
const PULL = 0.45; // 책등에서 표지 크기로 자라는 시간

/**
 * 책장에서 꺼낸 책 — 책등이 표지 크기로 자라난 뒤(shared layout) 표지가 왼쪽으로 넘어가며
 * 오른쪽 면이 드러난다. 왼쪽 면은 표지, 오른쪽 면은 서지와 읽기 기록.
 * 덮으면 표지가 다시 닫히고 책등 자리로 돌아간다.
 */
export default function OpenBook({ book, onClose }: Props) {
  // 책은 닫힌 채 잠깐 머물다 넘어간다 — 열림/닫힘 단계를 따로 든다.
  // 덮을 때는 book이 먼저 null이 되고, 표지가 닫힌 뒤에야 visible을 비운다.
  const [phase, setPhase] = useState<'closed' | 'open'>('closed');
  const [visible, setVisible] = useState<ShelfBook | null>(book);
  const [prevBook, setPrevBook] = useState<ShelfBook | null>(book);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  if (book !== prevBook) {
    // 렌더 중 파생 상태 조정 — props 변화에 즉시 반응하되 effect의 setState는 피한다
    setPrevBook(book);
    setPhase('closed');
    if (book) setVisible(book);
  }

  useEffect(() => {
    if (book) {
      const t = setTimeout(() => setPhase('open'), PULL * 1000 * 0.8);
      return () => clearTimeout(t);
    }
    if (visible) {
      const t = setTimeout(() => setVisible(null), FLIP * 1000 * 0.8);
      return () => clearTimeout(t);
    }
  }, [book, visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => closeButtonRef.current?.focus(), (PULL + FLIP) * 1000);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [visible, onClose]);

  const shown = visible;
  const progress = !shown
    ? ''
    : shown.isFinished
      ? '완독'
      : shown.totalPages != null
        ? `${shown.lastReadPage ?? 0} / ${shown.totalPages}`
        : shown.lastReadPage != null
          ? `${shown.lastReadPage}쪽`
          : '읽는 중';

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          key="open-book"
          role="dialog"
          aria-modal="true"
          aria-label={`${shown.title} 펼침`}
          className="fixed inset-0 z-[90]"
        >
          {/* 바깥 — 먹을 옅게 풀어 책장을 뒤로 물린다. 누르면 덮힌다 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-ink/30"
            onClick={onClose}
          />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <div
              className="pointer-events-auto relative aspect-[4/3] w-[min(92vw,520px)]"
              style={{ perspective: 1600 }}
            >
              {/* 오른쪽 면 — 서지와 읽기 기록. 표지가 넘어간 뒤에 드러난다 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === 'open' ? 1 : 0 }}
                transition={{ duration: 0.3, delay: phase === 'open' ? FLIP * 0.5 : 0 }}
                className="absolute inset-y-0 right-0 flex w-1/2 flex-col rounded-r-[4px] border border-l-0 border-hairline-strong bg-card px-5 py-5 sm:px-6"
                style={{
                  // 제본 안쪽 그늘 — 빛의 언어로만 입체감
                  backgroundImage:
                    'linear-gradient(to right, rgb(var(--ink) / 0.07), rgb(var(--ink) / 0) 14%)',
                }}
              >
                <Seal>{shown.isFinished ? '완독' : '읽는 중'}</Seal>
                <p className="mt-2 line-clamp-3 font-serif text-[17px] font-bold leading-snug text-ink sm:text-[19px]">
                  {shown.title}
                </p>
                {shown.author && (
                  <p className="mt-1 truncate font-serif text-[13px] text-ink-sub">
                    {shown.author}
                  </p>
                )}
                <div className="my-4 w-7 border-t border-hairline-strong" />
                <dl className="space-y-1 font-serif text-[12.5px] tabular-nums leading-relaxed text-ink-sub">
                  <div>
                    <dt className="sr-only">진행</dt>
                    <dd className={shown.isFinished ? 'text-accent' : undefined}>{progress}</dd>
                  </div>
                  {shown.readingPeriod && (
                    <div>
                      <dt className="sr-only">읽은 기간</dt>
                      <dd>{shown.readingPeriod}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="sr-only">남긴 문장</dt>
                    <dd>
                      {shown.entryCount > 0
                        ? `남긴 문장 ${shown.entryCount}개`
                        : '아직 남긴 문장 없음'}
                    </dd>
                  </div>
                </dl>
                <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-[13px]">
                  <Link href={shown.href} className="font-serif text-accent hover:underline">
                    책 상세 →
                  </Link>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    className="text-ink-faint transition-colors hover:text-ink-sub focus-visible:text-ink focus-visible:outline-none"
                  >
                    덮기
                  </button>
                </div>
              </motion.div>

              {/* 표지 — 책등 자리에서 자라나(shared layout), 왼쪽 가장자리를 축으로 넘어간다 */}
              <motion.div
                layoutId={spineLayoutId(shown.id)}
                transition={{ layout: { duration: PULL, ease: [0.22, 1, 0.36, 1] } }}
                className="absolute inset-y-0 left-1/2 w-1/2"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <motion.div
                  initial={false}
                  animate={{ rotateY: phase === 'open' ? -180 : 0 }}
                  transition={{ duration: FLIP, ease: [0.4, 0, 0.2, 1] }}
                  className="relative h-full w-full origin-left"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* 앞면 — 닫힌 책의 표지 */}
                  <div
                    className="absolute inset-0 overflow-hidden rounded-r-[4px] border border-hairline-strong bg-card"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <Image
                      src={shown.coverUrl ?? '/images/default-book-cover.png'}
                      alt=""
                      fill
                      sizes="260px"
                      className="object-cover"
                    />
                  </div>
                  {/* 뒷면 — 넘어가 왼쪽 면이 된 뒤에 보이는 표지. 미리 뒤집어 두어 바로 읽힌다 */}
                  <div
                    className="absolute inset-0 overflow-hidden rounded-l-[4px] border border-r-0 border-hairline-strong bg-card"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <Image
                      src={shown.coverUrl ?? '/images/default-book-cover.png'}
                      alt={`${shown.title} 표지`}
                      fill
                      sizes="260px"
                      className="object-cover"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          'linear-gradient(to left, rgb(var(--ink) / 0.14), rgb(var(--ink) / 0) 12%)',
                      }}
                    />
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
