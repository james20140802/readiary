'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { ChevronRight, MoreHorizontal, Share } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Leaf, Leaves } from '@/components/shell/Leaves';
import { TopBarActions, useTopBar } from '@/components/shell/TopBarContext';
import { frameFor } from '@/lib/shell/routes';
import { todayKST } from '@/lib/dates';
import type { Entry } from '@/types/entry';
import type { Book } from '@/types/book';
import { dateParts, monthDay, shortDate } from './dates';
import styles from './EntryLayer.module.css';

export interface EntryLayerProps {
  entry: Pick<Entry, 'id' | 'date' | 'quote' | 'note' | 'from_page' | 'to_page' | 'is_private'>;
  book: Pick<Book, 'id' | 'title' | 'author'>;
  /** 책 한 권으로 가는 주소(친구의 기록이면 친구 서재 안의 책) */
  bookUrl: string;
  isFriend?: boolean;
  /** 상단 바 뒤로 */
  back: { href: string; label: string };
  /** 덧붙인 생각 묶음(ReflectionThread) */
  reflections?: ReactNode;
  /** 좋아요·댓글 */
  reactions: ReactNode;
  /** 공유 시트를 연다 — 나만 보기 기록이나 친구의 기록이면 없다 */
  onShare?: () => void;
  /** 더 보기(공유·고치기·지우기) 시트를 연다 — 내 기록만 */
  onMore?: () => void;
  /** 견본에서 날짜를 고정할 때 */
  today?: string;
}

export function formatPages(fromPage?: number | null, toPage?: number | null) {
  if (fromPage != null && toPage != null && fromPage !== toPage) return `p.${fromPage}–${toPage}`;
  const page = fromPage ?? toPage;
  return page != null ? `p.${page}` : null;
}

const ICON_BUTTON = 'relative grid h-11 w-11 place-items-center rounded-full text-ink';
const LABEL = 'font-sans text-[14px] font-semibold';
const ROW =
  'flex min-h-[52px] w-full items-center gap-2.5 border-t border-hairline text-left font-sans text-[16px] font-medium text-ink';

/**
 * 기록 한 장 — 날짜 머리, 괘선 위의 문장, 출처, 그때의 생각 아래 덧붙인 생각 묶음.
 * 모바일은 '문장 → 공개와 반응' 두 장을 한 화면씩 넘기고, 데스크톱은 두 단으로 편다.
 * 일기장 장 넘김 틀('leaves')이 아닌 주소에서는 장 넘김 없이 위에서 아래로 흐른다.
 */
export default function EntryLayer({
  entry,
  book,
  bookUrl,
  isFriend = false,
  back,
  reflections,
  reactions,
  onShare,
  onMore,
  today: todayProp,
}: EntryLayerProps) {
  const today = todayProp ?? todayKST();
  const snap = frameFor(usePathname() ?? '') === 'leaves';
  const parts = dateParts(entry.date, today);
  const title = shortDate(entry.date, today);
  useTopBar({ title, back });

  const pages = formatPages(entry.from_page, entry.to_page);
  const main = entry.quote ?? entry.note ?? '';
  const then = entry.quote ? entry.note : null;

  const Wrap = snap ? Leaves : FlowWrap;
  const First = snap ? FirstLeaf : FlowSection;
  const Second = snap ? SecondLeaf : FlowAside;
  const secondTitle = isFriend ? '반응' : '공개와 반응';

  return (
    <>
      {!isFriend && (onMore || onShare) && (
        <TopBarActions>
          {onMore && (
            <button type="button" aria-label="더 보기" onClick={onMore} className={ICON_BUTTON}>
              <MoreHorizontal size={23} strokeWidth={1.75} aria-hidden />
            </button>
          )}
          {onShare && (
            <button type="button" aria-label="공유" onClick={onShare} className={ICON_BUTTON}>
              <Share size={22} strokeWidth={1.75} aria-hidden />
            </button>
          )}
        </TopBarActions>
      )}
      {/* 996px = 기존 본문 860px + 좌우 여백 136px. 데스크톱의 가운데 정렬을 유지한다. */}
      <div
        className={clsx(
          styles.root,
          snap && 'lg:mx-auto lg:max-w-[996px] lg:pb-16 lg:pl-20 lg:pr-14 lg:pt-11'
        )}
      >
        <Wrap>
          <First title={title}>
            {parts && (
              <div className="flex items-start gap-3.5">
                <span
                  data-skeleton
                  className="font-serif text-[96px] font-normal leading-[0.86] tracking-[-0.04em] text-ink lg:text-[150px]"
                >
                  {parts.day}
                </span>
                <div>
                  <div
                    data-skeleton
                    className="pt-1.5 font-sans text-[22px] font-bold text-ink lg:pt-4 lg:text-[28px]"
                  >
                    {parts.month}
                  </div>
                  <div className="mt-1.5 font-sans text-[16px] font-medium text-ink-sub">
                    <time data-skeleton dateTime={entry.date}>
                      {parts.meta}
                    </time>
                  </div>
                </div>
              </div>
            )}
            <p
              data-skeleton
              className={clsx(
                styles.onrule,
                'mt-[38px] whitespace-pre-wrap break-words pl-[34px] font-serif text-[25px] leading-[40px] tracking-[-0.01em] text-ink lg:mt-14 lg:pl-0 lg:text-[32px] lg:leading-[56px]',
                entry.quote ? 'font-semibold' : 'font-normal'
              )}
            >
              {main}
            </p>
            <div className="mt-3 pl-[34px] font-sans text-[15px] font-medium text-ink-sub lg:pl-0">
              <Link
                href={bookUrl}
                data-skeleton
                className="underline-offset-4 hover:text-ink hover:underline"
              >
                {book.title ?? '제목 없음'}
              </Link>
              {book.author && <span data-skeleton>{` · ${book.author}`}</span>}
              {pages && <span data-skeleton>{` · ${pages}`}</span>}
            </div>
            <div className="mt-6 pl-[34px] lg:mt-9 lg:max-w-[600px] lg:pl-0">
              {then && (
                <div>
                  <div className={clsx(LABEL, 'text-ink-faint')}>
                    그때의 생각 · <span data-skeleton>{monthDay(entry.date, today)}</span>
                  </div>
                  <p
                    data-skeleton
                    className="mt-0.5 whitespace-pre-wrap break-words font-serif text-[20px] leading-[40px] text-ink-sub lg:text-[22px]"
                  >
                    {then}
                  </p>
                </div>
              )}
              {reflections && (
                <div id="reflections" className="scroll-mt-24">
                  {reflections}
                </div>
              )}
            </div>
          </First>
          <Second title={secondTitle}>
            {!isFriend && (
              <>
                <h2 className="font-serif text-[26px] font-bold leading-[1.3] tracking-[-0.01em] text-ink lg:hidden">
                  누가 볼 수 있나요
                </h2>
                {(onShare || onMore) && (
                  <div className="mt-[34px] hidden flex-wrap gap-2 lg:flex">
                    {onShare && (
                      <Button variant="secondary" onClick={onShare}>
                        공유
                      </Button>
                    )}
                    {onMore && (
                      <Button variant="secondary" onClick={onMore}>
                        더 보기
                      </Button>
                    )}
                  </div>
                )}
                <div className="mt-4 lg:mt-7">
                  <Link href={`/entry/${entry.id}/edit`} className={ROW}>
                    <span>공개 범위</span>
                    <span data-skeleton className="ml-auto text-ink-sub">
                      {entry.is_private ? '나만 보기' : '친구에게 보임'}
                    </span>
                    <ChevronRight
                      size={18}
                      strokeWidth={1.75}
                      className="text-ink-faint"
                      aria-hidden
                    />
                  </Link>
                  {onShare ? (
                    <button type="button" onClick={onShare} className={ROW}>
                      <span>외부 링크</span>
                      <span className="ml-auto text-ink-sub">문장 카드로 공유</span>
                      <ChevronRight
                        size={18}
                        strokeWidth={1.75}
                        className="text-ink-faint"
                        aria-hidden
                      />
                    </button>
                  ) : (
                    <div className={ROW}>
                      <span>외부 링크</span>
                      <span className="ml-auto text-ink-sub">나만 보기라 닫혀 있어요</span>
                    </div>
                  )}
                </div>
              </>
            )}
            <div className={isFriend ? '' : 'mt-[30px] lg:mt-[22px]'}>{reactions}</div>
          </Second>
        </Wrap>
      </div>
    </>
  );
}

function FlowWrap({ children }: { children: ReactNode }) {
  return <div className={styles.flow}>{children}</div>;
}

function FlowSection({ children }: { title: string; children: ReactNode }) {
  return <section>{children}</section>;
}

function FlowAside({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="mt-12 border-t border-hairline pt-8 lg:mt-0 lg:border-0 lg:pt-0"
    >
      {children}
    </section>
  );
}

function FirstLeaf({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Leaf title={title} free>
      {children}
    </Leaf>
  );
}

function SecondLeaf({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Leaf title={title} vellum free>
      {children}
    </Leaf>
  );
}
