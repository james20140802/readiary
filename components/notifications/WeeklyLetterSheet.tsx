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
      <p data-letter-meta className="mb-2 text-caption text-ink-sub">
        {formatKoreanDate(block.date)} ·{' '}
        {block.kind === 'quote' ? '책의 문장' : block.kind === 'note' ? '나의 생각' : '독서 기록'}
        {block.continued ? ' · 이어서' : ''}
      </p>
      <p data-letter-title className="mb-3 break-words font-serif text-body font-semibold text-ink">
        {block.title}
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
      <header className="h-[116px] border-b border-hairline">
        <h2 className="font-serif text-display-sm">한 주의 독서 편지</h2>
        <p className="mt-2 font-serif text-body text-ink-sub">책 사이에 남겨 둔 문장과 생각</p>
        <p className="mt-3 text-caption text-accent">{period}</p>
      </header>
      <div data-letter-body className="mt-6 h-[456px]">
        {blocks.map((block, index) => (
          <LetterParagraph key={`${block.entryId}-${block.kind}-${index}`} block={block} />
        ))}
      </div>
      <footer className="mt-5 flex items-end justify-between border-t border-hairline pt-4">
        <p className="font-serif text-body">Readiary</p>
        <p className="text-caption tabular-nums text-ink-sub">
          {page} / {total}
        </p>
      </footer>
    </article>
  );
});
export default WeeklyLetterSheet;
