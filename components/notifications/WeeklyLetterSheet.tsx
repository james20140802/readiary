import { forwardRef } from 'react';
import { LIGHT_PALETTE } from '@/lib/share/palette';
import { formatKoreanDate } from '@/lib/dates';
import {
  LETTER_BLOCK_CLASS,
  LETTER_TEXT_CLASS,
  type LetterBlock,
} from '@/lib/export/weekly-letter';

export function LetterParagraph({ block }: { block: LetterBlock }) {
  return (
    <section className={LETTER_BLOCK_CLASS}>
      <div data-letter-source hidden={block.hideSource}>
        <p data-letter-meta className="mb-2 text-caption text-accent">
          {formatKoreanDate(block.date)} ·{' '}
          {block.kind === 'quote' ? '책의 문장' : block.kind === 'note' ? '나의 생각' : '독서 기록'}
          {block.continued ? ' · 이어서' : ''}
        </p>
        <p
          data-letter-title
          className="mb-3 break-words font-serif text-body font-semibold text-ink"
        >
          {block.title}
        </p>
      </div>
      <p
        data-letter-kind
        className="mb-2 text-caption text-ink-sub"
        hidden={!block.hideSource || block.kind !== 'note'}
      >
        나의 생각
      </p>
      <p data-letter-text className={LETTER_TEXT_CLASS}>
        {block.text}
      </p>
    </section>
  );
}

const WeeklyLetterSheet = forwardRef<
  HTMLDivElement,
  { blocks: LetterBlock[]; period: string; page: number; total: number }
>(function WeeklyLetterSheet({ blocks, period, page, total }, ref) {
  return (
    <article
      ref={ref}
      style={{ width: 540, height: 760, ...LIGHT_PALETTE }}
      className="box-border bg-paper px-11 py-10 text-ink"
    >
      <header className="grid h-[116px] grid-cols-[1fr_180px] items-start gap-6 border-b border-hairline">
        <h2 className="font-serif text-display-sm leading-tight">
          한 주의
          <br />
          독서 편지
        </h2>
        <div className="border-l border-hairline pl-5 pt-1">
          <p className="text-caption text-accent">{period.replace(/[—–]/g, '~')}</p>
          <p className="mt-3 font-serif text-body-sm leading-relaxed text-ink-sub">
            책 사이에 남겨 둔<br />
            문장과 생각을 보냅니다.
          </p>
        </div>
      </header>
      <div data-letter-body className="mt-6 h-[456px]">
        {blocks.map((block, index) => (
          <LetterParagraph key={`${block.entryId}-${block.kind}-${index}`} block={block} />
        ))}
      </div>
      <footer className="mt-3 flex items-end justify-between border-t border-hairline pt-3">
        <div>
          <p className="font-serif text-body-sm text-ink-sub">
            {page === total ? '다음 문장에서 또 만나요.' : '다음 장에 이야기가 이어집니다.'}
          </p>
          <p className="mt-2 font-serif text-caption">Readiary</p>
        </div>
        <p className="text-caption tabular-nums text-ink-sub">
          {page} / {total}
        </p>
      </footer>
    </article>
  );
});
export default WeeklyLetterSheet;
