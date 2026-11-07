'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import Pile from '@/components/ui/Pile';
import { quoteTier } from '@/components/entry/quoteTier';
import type { QuoteTier } from '@/components/entry/quoteTier';
import { formatPages } from '@/lib/entries/pages';
import { bookTallyForDisplay, titlePageSentence } from '@/lib/monthly-excerpt/model';
import { dayLabel, monthLabel } from '@/lib/monthly-excerpt/month';
import type { ExcerptItem, MonthKey } from '@/lib/monthly-excerpt/types';
import PastedPage, { ExcerptNote, PrivateMark } from './PastedPage';
import styles from './pasted.module.css';

export interface MonthlyExcerptReaderProps {
  month: MonthKey;
  items: ExcerptItem[];
  viewer: 'owner' | 'friend';
  /** 친구 화면의 표제지 문장에 쓰는 이름 */
  ownerName?: string;
  /** 엮기 미리보기: 묶음과 펼친 페이지만 그리고 소유자 동작은 그리지 않는다 */
  preview?: boolean;
  /** 표제지 아래 동작 자리 */
  actions?: ReactNode;
  /** 책 아래 좋아요·댓글 자리. 미리보기에는 없다 */
  reactions?: ReactNode;
}

const LINK = 'min-h-10 font-sans text-[15px] font-semibold';
const GRID = 'lg:grid lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:items-start lg:gap-[72px]';

/**
 * 달의 발췌집을 읽는 화면. 평소에는 간지 묶음을 넘겨 읽고(시안 inside-look B),
 * 펼치면 일기장 한 장에 붙은 조각으로 한 달을 한눈에 본다(시안 material-trial C).
 * 상단 바와 동작은 화면마다 달라 바깥에서 정한다. 내 화면, 엮기 미리보기, 친구 화면이 함께 쓴다.
 */
export default function MonthlyExcerptReader({
  month,
  items,
  viewer,
  ownerName,
  preview = false,
  actions,
  reactions,
}: MonthlyExcerptReaderProps) {
  const [unfolded, setUnfolded] = useState(false);
  // 처음 그릴 때는 움직이지 않고, 펼쳤다가 다시 묶을 때만 부드럽게 바꾼다
  const [rebound, setRebound] = useState(false);
  // 펼치고 묶으면 버튼이 새로 그려지므로 키보드 초점을 다시 그 버튼에 둔다
  const toggleRef = useRef<HTMLButtonElement>(null);
  const toggled = useRef(false);
  useEffect(() => {
    if (!toggled.current) return;
    toggled.current = false;
    toggleRef.current?.focus();
  }, [unfolded]);

  const label = monthLabel(month);
  const showPrivate = viewer === 'owner';
  const slot = preview ? null : actions;
  const reactionSlot = preview ? null : reactions;

  const toggleButton = (ref?: RefObject<HTMLButtonElement | null>) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={unfolded}
      onClick={() => {
        toggled.current = true;
        setRebound(unfolded);
        setUnfolded((v) => !v);
      }}
      className={`${LINK} text-ink`}
    >
      {unfolded ? '다시 묶기' : '한 페이지로 펼치기'}
    </button>
  );

  if (items.length === 0) {
    return (
      <>
        <TitlePage label={label} />
        {slot}
        <p className="mt-8 text-center font-serif text-note text-ink-sub">담긴 문장이 없어요.</p>
        {reactionSlot}
      </>
    );
  }

  const sentence = titlePageSentence(items, ownerName);
  const colophon = <Colophon label={label} count={items.length} />;

  // 반응은 펼침과 묶음 바깥의 같은 자리에 둔다. 다시 그려지면 방금 누른 좋아요와 열린 시트를 잃는다.
  const body = unfolded ? (
    <PastedPage
      items={items}
      showPrivate={showPrivate}
      header={<TitlePage label={label} sentence={sentence} actions={slot} align="left" />}
      toggle={toggleButton(toggleRef)}
      footer={
        <>
          <div className="mt-3 flex justify-end">{toggleButton()}</div>
          {colophon}
        </>
      }
    />
  ) : (
    <div className={`${GRID} ${rebound ? styles.rebound : ''}`}>
      <div className="lg:sticky lg:top-11">
        <TitlePage
          label={label}
          sentence={sentence}
          books={bookTallyForDisplay(items)}
          actions={slot}
        />
      </div>
      <div>
        <Pile
          items={items}
          getKey={(item) => item.entryId}
          label="고른 문장 묶음. 맨 위 간지를 옆으로 밀면 다음 문장이 나와요"
          nextLabel="다음 장"
          slipInset={50}
          // 아이패드 세로에서도 한 장이 화면을 넘게 커지지 않도록 폭을 묶는다
          className="mx-auto max-w-[500px] lg:mx-0"
          renderHeader={({ position, next, canNext, nextLabel }) => (
            <div className="mb-2 mt-2 flex items-center justify-between gap-2">
              <span
                data-skeleton
                aria-live="polite"
                className="font-mono text-[13px] font-medium text-ink-sub"
              >
                {position}
              </span>
              <span className="flex gap-3.5">
                {toggleButton(toggleRef)}
                {canNext && (
                  <button type="button" onClick={next} className={`${LINK} text-accent`}>
                    {nextLabel}
                  </button>
                )}
              </span>
            </div>
          )}
          renderSlip={(item, { isTop }) => (
            <PileSlip item={item} isTop={isTop} showPrivate={showPrivate} />
          )}
        />
        {colophon}
      </div>
    </div>
  );

  return (
    <>
      {body}
      {reactionSlot && (
        <div className={unfolded ? '' : GRID}>
          <div
            // 판권과 같은 왼쪽 선에 맞춘다. 펼친 페이지에서는 여백선 안쪽이다(.page의 왼쪽 여백)
            className={unfolded ? 'mx-auto w-full pl-9 lg:max-w-[640px] lg:pl-0' : 'lg:col-start-2'}
          >
            {reactionSlot}
          </div>
        </div>
      )}
    </>
  );
}

function TitlePage({
  label,
  sentence,
  books,
  actions,
  align = 'center',
}: {
  label: string;
  sentence?: string;
  books?: { title: string; count: number }[];
  actions?: ReactNode;
  align?: 'center' | 'left';
}) {
  const center = align === 'center';
  return (
    <div className={`pb-2.5 pt-[30px] ${center ? 'text-center lg:text-left' : 'text-left'}`}>
      <div className="font-sans text-[13px] font-semibold tracking-[0.16em] text-ink-sub">
        달의 발췌집
      </div>
      <h1
        data-skeleton
        className="mt-[18px] text-balance break-keep font-serif text-[30px] font-bold leading-[1.35] text-ink"
      >
        {label}
      </h1>
      {sentence && (
        <p
          data-skeleton
          className="mt-[18px] text-balance break-keep font-serif text-[17px] leading-[1.7] text-ink-sub"
        >
          {sentence}
        </p>
      )}
      {books && (
        <ul className="mx-auto mt-[18px] max-w-[500px] border-t border-hairline pt-2.5 text-left lg:mx-0 lg:max-w-none">
          {/* 제목이 같은 다른 책이 있을 수 있어 제목만으로 키를 삼지 않는다 */}
          {books.map((book, i) => (
            <li
              key={`${i}-${book.title}`}
              className="flex items-baseline justify-between gap-3 leading-[1.9]"
            >
              <span
                data-skeleton
                className="min-w-0 truncate font-serif text-[16px] font-semibold text-ink"
              >
                {book.title}
              </span>
              <span
                data-skeleton
                className="flex-none font-sans text-[14px] font-medium text-ink-sub"
              >
                {book.count}
                <span className="sr-only">개</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {actions && (
        <div
          className={`mt-[22px] flex flex-wrap gap-2 ${center ? 'justify-center lg:justify-start' : ''}`}
        >
          {actions}
        </div>
      )}
    </div>
  );
}

function Colophon({ label, count }: { label: string; count: number }) {
  return (
    <div className="mt-[30px] border-t border-ink pt-5 font-sans text-[14px] font-medium leading-[1.9] text-ink-sub">
      <span data-skeleton>{label}</span>의 발췌집
      <br />
      문장 <span data-skeleton>{count}</span>
    </div>
  );
}

// 간지 한 장의 안쪽 여백(.vellum-slip 16/18px)을 책별 발췌집과 같게 바꾸고 4:5 칸으로 고정한다.
// 책별과 달리 칸이 늘지 않는다. 생각까지 붙으면 묶음이 들쭉날쭉해져서, 긴 글은 SLIP_TEXT로 줄이고 그래도 넘치면 장 안에서 스크롤한다.
const SLIP_BOX =
  '-mx-[18px] -mb-[18px] -mt-4 flex aspect-[4/5] flex-col overflow-hidden px-6 pb-5 pt-[22px] lg:aspect-auto lg:h-[480px]';

/**
 * 긴 글은 작게 써서 4:5 칸 안에 담는다(책별 발췌집과 같은 단계). 생각도 칸을 나눠 쓰므로 함께 센다.
 * 그래도 넘치면 장 안에서 스크롤한다.
 */
const SLIP_TEXT: Record<QuoteTier, { quote: string; note: string }> = {
  lg: { quote: 'text-[22px] font-semibold leading-[1.65] lg:text-[24px]', note: 'text-[17px]' },
  md: { quote: 'text-[19px] font-semibold leading-[1.65] lg:text-[21px]', note: 'text-[17px]' },
  sm: { quote: 'text-[17px] font-semibold leading-[1.65] lg:text-[19px]', note: 'text-[16px]' },
  xs: { quote: 'text-[15px] font-normal leading-[1.7] lg:text-[17px]', note: 'text-[15px]' },
};

/** 간지 한 장 — 위에 책 이름, 가운데 문장과 생각, 아래에 쪽과 날짜 */
function PileSlip({
  item,
  isTop,
  showPrivate,
}: {
  item: ExcerptItem;
  isTop: boolean;
  showPrivate: boolean;
}) {
  const pages = formatPages(item.fromPage, item.toPage);
  const text = SLIP_TEXT[quoteTier(item.note ? `${item.quote}\n${item.note}` : item.quote)];
  return (
    <div className={SLIP_BOX}>
      <div className="flex flex-none items-baseline justify-between gap-3 border-b border-hairline pb-2.5">
        <span
          data-skeleton
          // Pile의 칸은 내용의 최소 폭만큼 늘어난다. 긴 제목이 묶음을 밀지 않게 폭을 0에서 시작한다
          className="w-0 flex-1 truncate font-serif text-[15px] font-semibold text-ink-sub"
        >
          {item.book.title}
        </span>
        {showPrivate && item.isPrivate && <PrivateMark />}
      </div>
      <SlipBody isTop={isTop}>
        <p
          data-skeleton
          className={`whitespace-pre-wrap font-serif [overflow-wrap:anywhere] tracking-[-0.01em] text-ink ${text.quote}`}
        >
          {item.quote}
        </p>
        {item.note && (
          <ExcerptNote note={item.note} className={`mt-3.5 leading-[1.65] ${text.note}`} />
        )}
      </SlipBody>
      <div className="flex flex-none justify-between gap-3 pt-2.5 font-sans text-[13px] font-medium text-ink-faint">
        <span data-skeleton>{pages}</span>
        <time data-skeleton dateTime={item.date}>
          {dayLabel(item.date)}
        </time>
      </div>
    </div>
  );
}

/**
 * 장 안에서 스크롤되는 칸. 넘칠 때만 키보드로 잡혀 화살표로 끝까지 읽을 수 있고,
 * 아래에 내용이 더 있으면 끝을 흐려 이어진다는 것을 보인다.
 */
function SlipBody({ isTop, children }: { isTop: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [more, setMore] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      setOverflowing(el.scrollHeight > el.clientHeight + 1);
      setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    };
    measure();
    // 칸 크기는 그대로인 채 글자만 커지는 폰트 교체는 ResizeObserver가 알려 주지 않는다
    let mounted = true;
    void document.fonts?.ready.then(() => {
      if (mounted) measure();
    });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(el);
    return () => {
      mounted = false;
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={overflowing && isTop ? 0 : undefined}
      role={overflowing ? 'group' : undefined}
      aria-label={overflowing ? '문장 전체, 위아래로 스크롤' : undefined}
      onScroll={(e) => {
        const el = e.currentTarget;
        setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
      }}
      className={`mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain ${more ? '[mask-image:linear-gradient(to_bottom,black_calc(100%-32px),transparent)]' : ''}`}
    >
      {children}
    </div>
  );
}
