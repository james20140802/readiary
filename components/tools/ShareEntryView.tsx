import Link from 'next/link';
import Button from '@/components/ui/Button';
import type { PublicShareEntry } from '@/lib/share/fetchPublicEntry';
import { formatDateLabel } from '@/lib/share/format';
import PublicHeader from './PublicHeader';

/**
 * 공유받은 문장 한 장(시안 share.html) — 메뉴 없는 괘선 위에 기울어진 간지 한 장,
 * 아래에 Readiary를 처음 만난 사람을 위한 한 줄과 시작 버튼. 무엇을 보여 줄지는
 * fetchPublicEntry(외부 공유 `shared_at` 규칙)가 정하고, 이 부품은 받은 것만 그린다.
 */
export default function ShareEntryView({ entry }: { entry: PublicShareEntry }) {
  const source = [entry.bookTitle, entry.bookAuthor].filter(Boolean).join(' · ');
  return (
    <div className="mx-auto max-w-[1000px]">
      <PublicHeader />
      <article className="vellum mx-auto mt-[6vh] max-w-[620px] -rotate-[0.8deg] rounded-[3px] px-[30px] pb-[26px] pt-[34px]">
        <p className="font-sans text-caption font-semibold text-ink-sub">
          {entry.nickname}님의 {entry.quote ? '문장' : '생각'} <span aria-hidden="true">·</span>{' '}
          <time dateTime={entry.date}>{formatDateLabel(entry.date)}</time>
        </p>
        {entry.quote && (
          <blockquote className="mt-[18px] whitespace-pre-line break-words font-serif text-[27px] font-semibold leading-[1.65] tracking-[-0.01em] text-ink">
            {entry.quote}
          </blockquote>
        )}
        {entry.note && (
          <p
            className={
              entry.quote
                ? 'mt-4 whitespace-pre-line break-words border-l-2 border-hairline pl-3.5 font-serif text-note text-ink-sub'
                : 'mt-[18px] whitespace-pre-line break-words font-serif text-quote font-normal text-ink'
            }
          >
            {entry.quote && <span className="sr-only">{entry.nickname}님의 생각: </span>}
            {entry.note}
          </p>
        )}
        <p className="mt-[18px] break-words font-sans text-caption text-ink-sub">{source}</p>
      </article>
      <div className="mx-auto mt-11 max-w-[620px] text-center">
        <p className="break-keep font-serif text-note text-ink-sub">
          마음에 남은 문장을 적어 두면,
          <br />한 달 뒤에도 일 년 뒤에도 다시 만나요.
        </p>
        <Button asChild className="mt-[18px]">
          <Link href="/signup" prefetch={false}>
            Readiary에서 나의 문장 기록하기
          </Link>
        </Button>
      </div>
    </div>
  );
}
