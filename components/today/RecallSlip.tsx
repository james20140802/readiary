import Link from 'next/link';
import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';
import PushSeen from '@/components/PushSeen';
import type { RecallEntry } from '@/lib/recall/fetchRecallEntry';
import { recallKicker } from './todayCopy';
import s from './today.module.css';

interface Props {
  recall: RecallEntry;
  todayKst: string;
  /** 지금의 생각 덧붙이기(덧붙인 생각 기능)가 켜져 있을 때만 그 문을 보인다 */
  reflect: boolean;
  desk?: boolean;
  /** 실제 화면에서만 회상 알림을 읽음 처리한다(견본에서는 끈다) */
  markSeen?: boolean;
}

/**
 * 회상 간지 — 시안 home2 .recall(모바일: 쓰기 아래로 겹침) / .stack(데스크톱: 두 장 겹친 간지).
 * 간지 전체가 기록으로 가는 링크이고, 지금의 생각 덧붙이기는 그 위에 따로 놓인 형제 링크다(중첩하지 않는다).
 */
export default function RecallSlip({ recall, todayKst, reflect, desk, markSeen = true }: Props) {
  const href = `/entry/${recall.id}`;
  const kicker = recallKicker(recall, todayKst);
  const meta = [recall.bookTitle, recall.bookAuthor].filter(Boolean).join(' · ');

  const body = (
    <>
      {markSeen && <PushSeen kind="recall" />}
      <Link
        href={href}
        aria-label={`${kicker}, ${recall.bookTitle}에서 남긴 문장 다시 읽기`}
        className="absolute inset-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <div className="font-sans text-[15px] font-semibold text-accent">{kicker}</div>
      <blockquote
        className={clsx(
          'font-serif font-semibold text-ink',
          desk
            ? 'mt-3 text-quote-lg'
            : clsx(s.recallQuote, 'mt-2.5 text-[23px] leading-[1.6] tracking-[-0.01em]')
        )}
      >
        {recall.quote}
      </blockquote>
      <div className={clsx('font-sans text-caption text-ink-sub', desk ? 'mt-3' : 'mt-2.5')}>
        {meta}
      </div>
      {reflect && (
        <Link
          href={`${href}?reflect=1#reflections`}
          className={clsx(
            'relative inline-flex min-h-11 items-center gap-1.5 font-sans text-[17px] font-semibold text-ink',
            'focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            desk ? 'mt-1.5' : clsx('mt-1', s.recallReflect)
          )}
        >
          지금의 생각 덧붙이기
          <ArrowRight size={18} strokeWidth={1.75} aria-hidden />
        </Link>
      )}
    </>
  );

  if (desk) {
    return (
      <div className={s.stack}>
        <div aria-hidden className={clsx('vellum', s.stackBack)} />
        <section aria-label="다시 만나는 문장" className={clsx('vellum', s.stackFront)}>
          {body}
        </section>
      </div>
    );
  }
  return (
    <section
      aria-label="다시 만나는 문장"
      className={clsx('vellum rounded-[3px] px-[26px] pb-3.5 pt-[22px]', s.recallMobile)}
    >
      {body}
    </section>
  );
}
