'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import Seal from '@/components/ui/Seal';
import {
  STACK_MAX,
  pageStackShadow,
  pageStacks,
  photoTilt,
  spansYears,
} from '@/lib/books/openBook';
import { spineLayoutId, type ShelfBook } from './BookSpineShelf';

interface Props {
  book: ShelfBook | null;
  /** 책장 위 공간을 열어 둘지 — 책을 바꿔 열 때는 열린 채로 다음 책을 꺼낸다 */
  slotOpen: boolean;
  onClose: () => void;
  /** 표지가 책등 자리로 돌아가기 시작할 때 — 책장이 그 자리의 책등을 다시 보여야 한다 */
  onReturn: () => void;
  /** 표지가 책등 자리로 돌아간 뒤 */
  onClosed: () => void;
}

/** 꺼내기(책등→표지) · 넘기기(표지) 시간, 초 */
export const PULL = 0.45;
export const FLIP = 0.6;
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const BOARD = 3; // 판이 종이보다 넓게 나오는 여백
const PAGE_BOTTOM = BOARD + Math.ceil(STACK_MAX * 0.3); // 부채꼴로 내려오는 단면 자리

type Stage = 'idle' | 'pull' | 'open' | 'fold' | 'return';

/** 기간이 좁은 면에서 접힐 때 날짜 안에서 끊기지 않게 — 대시 뒤에서만 줄이 바뀐다 */
function PeriodText({ period }: { period: string }) {
  const [from, to] = period.split(' — ');
  if (!to) return <>{period}</>;
  return (
    <>
      <span className="inline-block">{from} —</span> <span className="inline-block">{to}</span>
    </>
  );
}

function progressText(b: ShelfBook): string {
  if (b.isFinished) return '완독';
  if (b.totalPages != null) return `${b.lastReadPage ?? 0} / ${b.totalPages}`;
  if (b.lastReadPage != null) return `${b.lastReadPage}쪽`;
  return '읽는 중';
}

/**
 * 책장에서 꺼낸 책 — 책장 위에 자리가 열리고(책장은 그만큼 내려앉는다), 책등이 표지 크기로
 * 자라나 그 자리에 놓인 뒤 표지가 왼쪽으로 넘어간다. 왼쪽 면에는 표지 사진을 붙인 종이,
 * 오른쪽 면에는 서지와 읽기 기록. 읽은 만큼은 왼쪽에, 남은 만큼은 오른쪽에 종이가 쌓인다.
 * 덮으면 표지가 닫히고 책등 자리로 돌아간 뒤에야 자리가 닫힌다.
 */
export default function OpenBook({ book, slotOpen, onClose, onReturn, onClosed }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [visible, setVisible] = useState<ShelfBook | null>(null);
  const [prevBook, setPrevBook] = useState<ShelfBook | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const onClosedRef = useRef(onClosed);
  const onReturnRef = useRef(onReturn);
  useEffect(() => {
    onClosedRef.current = onClosed;
    onReturnRef.current = onReturn;
  }, [onClosed, onReturn]);

  if (book !== prevBook) {
    // 렌더 중 파생 상태 조정 — props 변화에 즉시 반응하되 effect의 setState는 피한다
    setPrevBook(book);
    if (book) {
      setVisible(book);
      setStage('pull');
    } else if (stage === 'pull' || stage === 'open') {
      setStage('fold');
    }
  }

  // 단계 진행은 전부 타이머로 — pull → open, fold → return → idle
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (stage === 'pull') t = setTimeout(() => setStage('open'), PULL * 800);
    else if (stage === 'fold')
      t = setTimeout(() => {
        // 같은 커밋에서 표지가 빠지고 책등이 드러나야 그 자리로 morph한다
        setVisible(null);
        setStage('return');
        onReturnRef.current();
      }, FLIP * 850);
    else if (stage === 'return')
      t = setTimeout(() => {
        setStage('idle');
        onClosedRef.current();
      }, PULL * 1000);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'open') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // 책 바깥을 누르면 덮는다 — 책장 위 한 지면이라 백드롭 대신 문서 전체를 듣는다
    const onPointerDown = (e: PointerEvent) => {
      if (bookRef.current && !bookRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointerDown);
    const t = setTimeout(() => closeButtonRef.current?.focus({ preventScroll: true }), FLIP * 1000);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointerDown);
      clearTimeout(t);
    };
  }, [stage, onClose]);

  const shown = visible;
  const stacks = shown ? pageStacks(shown.totalPages, shown.lastReadPage, shown.isFinished) : null;
  const isOpen = stage === 'open';

  return (
    <motion.section
      aria-label="꺼낸 책"
      initial={false}
      animate={{ height: slotOpen ? 'auto' : 0 }}
      transition={{ duration: PULL, ease: EASE_OUT }}
      onAnimationComplete={() => {
        if (slotOpen) stageRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }}
      className={slotOpen ? 'overflow-visible' : 'pointer-events-none overflow-hidden'}
    >
      <div ref={stageRef} className="mx-auto w-[min(100%,480px)] py-6">
        {/* 책 한 권의 자리 — 왼쪽 절반은 넘어간 표지, 오른쪽 절반은 남은 종이 */}
        <div ref={bookRef} className="relative aspect-[10/7]" style={{ perspective: 1600 }}>
          {shown && stacks && (
            <motion.div
              key={`right-${shown.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: stage === 'return' ? 0 : 1 }}
              transition={{ duration: PULL * 0.6, delay: stage === 'pull' ? PULL * 0.4 : 0 }}
              className="absolute inset-y-0 left-1/2 w-1/2"
            >
              {/* 뒤표지 판 */}
              <div className="absolute inset-0 rounded-r-[5px] border border-l-0 border-hairline-strong bg-card-raised" />
              {/* 남은 종이 — 오른쪽으로 쌓인 단면 위에 오른쪽 면 */}
              <div
                className="absolute left-0 rounded-r-[2px] bg-card"
                style={{
                  top: BOARD,
                  bottom: PAGE_BOTTOM,
                  right: BOARD + stacks.right,
                  boxShadow: pageStackShadow(stacks.right, 1),
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    // 제본 안쪽 그늘 — 빛의 언어로만 입체감
                    backgroundImage:
                      'linear-gradient(to right, rgb(var(--ink) / 0.09), rgb(var(--ink) / 0) 16%)',
                  }}
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isOpen ? 1 : 0 }}
                  transition={{ duration: 0.3, delay: isOpen ? FLIP * 0.45 : 0 }}
                  className="relative flex h-full flex-col px-4 py-4 sm:px-5 sm:py-5"
                >
                  <Seal>{shown.isFinished ? '완독' : '읽는 중'}</Seal>
                  {/* 제목도 상세로 가는 문 — 아래 "책 상세 →"와 같은 곳 */}
                  <p className="mt-2 line-clamp-3 font-serif text-[15px] font-bold leading-snug text-ink sm:text-[18px]">
                    <Link
                      href={shown.href}
                      tabIndex={isOpen ? undefined : -1}
                      className="hover:underline hover:decoration-hairline-strong hover:underline-offset-4 focus-visible:underline focus-visible:outline-none"
                    >
                      {shown.title}
                    </Link>
                  </p>
                  {shown.author && (
                    <p className="mt-1 truncate font-serif text-[12px] text-ink-sub sm:text-[13px]">
                      {shown.author}
                    </p>
                  )}
                  <div className="my-3 w-6 border-t border-hairline-strong sm:my-4 sm:w-7" />
                  <dl className="space-y-0.5 font-serif text-[12px] tabular-nums leading-relaxed text-ink-sub sm:text-[12.5px]">
                    <div>
                      <dt className="sr-only">진행</dt>
                      <dd className={shown.isFinished ? 'text-accent' : undefined}>
                        {progressText(shown)}
                      </dd>
                    </div>
                    {shown.readingPeriod && (
                      <div>
                        <dt className="sr-only">읽은 기간</dt>
                        {/* 해를 넘긴 기간은 연도가 두 번 들어가 길다 — 그때만 반 단계 줄인다 */}
                        <dd
                          className={spansYears(shown.readingPeriod) ? 'text-[11.5px]' : undefined}
                        >
                          <PeriodText period={shown.readingPeriod} />
                        </dd>
                      </div>
                    )}
                    {shown.entryCount != null && (
                      <div>
                        <dt className="sr-only">남긴 문장</dt>
                        <dd>
                          {shown.entryCount > 0
                            ? `남긴 문장 ${shown.entryCount}개`
                            : '아직 남긴 문장 없음'}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-[12.5px] sm:text-[13px]">
                    <Link
                      href={shown.href}
                      tabIndex={isOpen ? undefined : -1}
                      className="font-serif text-accent hover:underline"
                    >
                      책 상세 →
                    </Link>
                    <button
                      ref={closeButtonRef}
                      type="button"
                      onClick={onClose}
                      tabIndex={isOpen ? undefined : -1}
                      className="text-ink-faint transition-colors hover:text-ink-sub focus-visible:text-ink focus-visible:outline-none"
                    >
                      덮기
                    </button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* 앞표지와 읽은 종이 — 책등 자리에서 자라나(shared layout), 왼쪽 가장자리를 축으로 넘어간다 */}
          <AnimatePresence>
            {shown && stacks && (
              <motion.div
                key={`cover-${shown.id}`}
                layoutId={spineLayoutId(shown.id)}
                exit={{ opacity: 0 }}
                transition={{
                  layout: { duration: PULL, ease: EASE_OUT },
                  opacity: { duration: PULL * 0.5, delay: PULL * 0.4 },
                }}
                // pointer-events-none — 넘어간 표지의 회전 안 된 부모 상자가 오른쪽 면 위에 남아
                // "덮기"·"책 상세"를 가린다. 표지엔 누를 것이 없으니 포인터를 통과시킨다
                className="pointer-events-none absolute inset-y-0 left-1/2 w-1/2"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <motion.div
                  initial={false}
                  animate={{ rotateY: isOpen ? -180 : 0 }}
                  transition={{ duration: FLIP, ease: [0.4, 0, 0.2, 1] }}
                  className="relative h-full w-full origin-left"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* 앞면 — 닫힌 책의 표지. 시안의 발췌집 표지 문법: 제본 줄, 가운데 정렬 서지, 잉크 표식 */}
                  <div
                    className={`absolute inset-0 overflow-hidden rounded-r-[5px] border border-hairline-strong ${
                      shown.isFinished ? 'bg-card-raised' : 'bg-card'
                    }`}
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-[5px] w-px bg-hairline-strong"
                    />
                    <span aria-hidden className="absolute inset-y-0 left-[9px] w-px bg-hairline" />
                    {/* layout — 부모가 책등에서 자라나는 동안 framer가 스케일을 되돌려 글이 늘어나지 않는다.
                        그래서 표지 글을 처음부터 보일 수 있다: 상자가 커지며 드러난다 */}
                    <motion.div
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ opacity: { duration: 0.2, delay: 0.05 } }}
                      className="flex h-full flex-col items-center justify-center px-5 text-center"
                    >
                      <p className="line-clamp-3 font-serif text-[15px] font-bold leading-snug text-ink sm:text-[17px]">
                        {shown.title}
                      </p>
                      {shown.author && (
                        <p className="mt-1.5 truncate font-serif text-[11.5px] text-ink-sub sm:text-[12.5px]">
                          {shown.author}
                        </p>
                      )}
                      <span aria-hidden className="my-4 w-6 border-t border-hairline-strong" />
                      <p className="font-serif text-[11px] tabular-nums text-ink-sub sm:text-[12px]">
                        {progressText(shown)}
                      </p>
                      {shown.readingPeriod && (
                        <p className="mt-0.5 font-serif text-[11px] tabular-nums text-ink-sub sm:text-[12px]">
                          <PeriodText period={shown.readingPeriod} />
                        </p>
                      )}
                      <Seal className="mt-4">{shown.isFinished ? '완독' : '읽는 중'}</Seal>
                    </motion.div>
                  </div>

                  {/* 뒷면 — 넘어가 왼쪽이 된 앞표지 안쪽. 읽은 종이가 왼쪽으로 쌓이고, 맨 위 종이에 표지 사진 */}
                  <div
                    className="absolute inset-0"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <div className="absolute inset-0 rounded-l-[5px] border border-r-0 border-hairline-strong bg-card-raised" />
                    <div
                      className="absolute right-0 rounded-l-[2px] bg-card"
                      style={{
                        top: BOARD,
                        bottom: PAGE_BOTTOM,
                        left: BOARD + stacks.left,
                        boxShadow: pageStackShadow(stacks.left, -1),
                      }}
                    >
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                          backgroundImage:
                            'linear-gradient(to left, rgb(var(--ink) / 0.09), rgb(var(--ink) / 0) 16%)',
                        }}
                      />
                      {shown.coverUrl ? (
                        /* 종이 위에 붙인 사진 — 인화지 여백에 살짝 비스듬히 */
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            className="w-[58%] border border-hairline bg-card p-[3.5%]"
                            style={{
                              transform: `rotate(${photoTilt(shown.id)}deg)`,
                              boxShadow:
                                '0 1px 1px rgb(var(--ink) / 0.12), 0 5px 12px rgb(var(--ink) / 0.10)',
                            }}
                          >
                            <div className="relative aspect-[2/3]">
                              <Image
                                src={shown.coverUrl}
                                alt={`${shown.title} 표지`}
                                fill
                                sizes="160px"
                                className="object-cover"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* 표지가 없으면 속표지처럼 — 제목을 세로로 */
                        <div className="absolute inset-0 flex items-center justify-center gap-3 py-6">
                          <span
                            className="max-h-full overflow-hidden text-ellipsis whitespace-nowrap font-serif text-[15px] tracking-[0.1em] text-ink"
                            style={{ writingMode: 'vertical-rl' }}
                          >
                            {shown.title}
                          </span>
                          {shown.author && (
                            <span
                              className="max-h-full overflow-hidden text-ellipsis whitespace-nowrap font-serif text-[11.5px] tracking-[0.08em] text-ink-sub"
                              style={{ writingMode: 'vertical-rl' }}
                            >
                              {shown.author}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
}
