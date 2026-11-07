import type { CSSProperties, ReactNode } from 'react';
import { dayLabel } from '@/lib/monthly-excerpt/month';
import { pastedDelay, pastedPose } from '@/lib/monthly-excerpt/pasted';
import type { ExcerptItem } from '@/lib/monthly-excerpt/types';
import styles from './pasted.module.css';

/** 문장 아래 생각 — 왼쪽의 짧은 선으로 문장과 구분한다 */
export function ExcerptNote({ note, className }: { note: string; className?: string }) {
  return (
    <p
      data-skeleton
      className={`relative whitespace-pre-wrap pl-3 font-serif [overflow-wrap:anywhere] text-ink-sub before:absolute before:left-0 before:top-[0.45em] before:h-[0.8em] before:w-0.5 before:bg-hairline-strong ${className ?? ''}`}
    >
      {note}
    </p>
  );
}

/** 내 화면에서만 보이는 비공개 표시 */
export function PrivateMark() {
  return <span className="flex-none font-sans text-[13px] font-medium text-ink-sub">비공개</span>;
}

interface PastedPageProps {
  items: ExcerptItem[];
  showPrivate: boolean;
  /** 표제 */
  header: ReactNode;
  /** 조각 위 오른쪽에 놓이는 '다시 묶기' */
  toggle: ReactNode;
  /** 조각 아래(끝까지 읽은 뒤 묶는 버튼, 판권) */
  footer: ReactNode;
}

/** 일기장 한 장에 문장 조각을 오려 붙인 페이지(시안 material-trial C). 고른 순서 그대로다. */
export default function PastedPage({
  items,
  showPrivate,
  header,
  toggle,
  footer,
}: PastedPageProps) {
  return (
    <div className="mx-auto w-full lg:max-w-[640px]">
      {header}
      <div className="mt-2 flex justify-end">{toggle}</div>
      <ol aria-label="오려 붙인 문장" className="mt-1 flex flex-col gap-2">
        {items.map((item, i) => {
          const pose = pastedPose(i);
          return (
            <li
              key={item.entryId}
              className={styles.slipBox}
              style={{ '--paste-delay': `${pastedDelay(i)}ms` } as CSSProperties}
            >
              <div
                className={`vellum-slip ${styles.slip}`}
                style={
                  {
                    '--paste-tilt': `${pose.tilt}deg`,
                    marginLeft: pose.left,
                    marginRight: pose.right,
                  } as CSSProperties
                }
              >
                <p
                  data-skeleton
                  className="whitespace-pre-wrap font-serif text-[19px] [overflow-wrap:anywhere] font-semibold leading-[1.6] tracking-[-0.01em] text-ink"
                >
                  {item.quote}
                </p>
                {item.note && (
                  <ExcerptNote note={item.note} className="mt-2.5 text-[16px] leading-[1.6]" />
                )}
                <div className="mt-2.5 flex items-baseline justify-between gap-3 font-sans text-[13px] font-medium text-ink-faint">
                  <span data-skeleton className="min-w-0 break-keep">
                    {item.book.title}
                  </span>
                  <span className="flex flex-none items-baseline gap-2">
                    {showPrivate && item.isPrivate && <PrivateMark />}
                    <time data-skeleton dateTime={item.date}>
                      {dayLabel(item.date)}
                    </time>
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {footer}
    </div>
  );
}
