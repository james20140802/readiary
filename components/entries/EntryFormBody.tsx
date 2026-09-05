'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { todayKST } from '@/lib/dates';
import { hasEntryContent } from '@/lib/entries/validation';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';

export interface EntryFormValues {
  quote: string | null;
  note: string | null;
  from_page: number | null;
  to_page: number | null;
  date: string;
  is_private: boolean;
}

export type EntryFormInitial = Partial<{
  quote: string;
  note: string;
  fromPage: number | null;
  toPage: number | null;
  date: string;
  isPrivate: boolean;
}>;

interface EntryFormBodyProps {
  /** 종료 페이지 상한 — 책의 총 쪽수 */
  totalPages?: number | null;
  submitLabel: string;
  initial?: EntryFormInitial;
  onSubmit: (values: EntryFormValues) => Promise<string | null>;
  /** 시트처럼 열리자마자 쓰기 시작하는 자리에서 첫 칸에 포커스 */
  autoFocus?: boolean;
  /** 컨트롤 행 왼쪽에 끼워 넣는 조용한 부가 동작 (예: 삭제) */
  secondaryAction?: React.ReactNode;
}

/**
 * 기록 폼의 알맹이 — 문장·생각 두 장, 쪽수·날짜·공개 여부 컨트롤 한 줄, 저장 버튼.
 * 페이지(EntryForm)와 바텀시트(EntryEditSheet)가 같이 쓴다. 문장·생각 중 하나만 있으면 저장,
 * 날짜 백필 허용, 페이지 선택.
 */
export default function EntryFormBody({
  totalPages,
  submitLabel,
  initial,
  onSubmit,
  autoFocus = false,
  secondaryAction,
}: EntryFormBodyProps) {
  const [quote, setQuote] = useState(initial?.quote ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [fromPage, setFromPage] = useState(initial?.fromPage?.toString() ?? '');
  const [toPage, setToPage] = useState(initial?.toPage?.toString() ?? '');
  const [date, setDate] = useState(initial?.date ?? todayKST());
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasEntryContent(quote, note)) {
      setError('문장이나 생각 중 하나는 남겨주세요.');
      return;
    }
    if (fromPage !== '' && toPage !== '' && Number(fromPage) > Number(toPage)) {
      setError('시작 페이지는 종료 페이지보다 작거나 같아야 합니다.');
      return;
    }
    if (date === '') {
      setError('읽은 날짜를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const message = await onSubmit({
        quote: quote.trim() === '' ? null : quote.trim(),
        note: note.trim() === '' ? null : note.trim(),
        from_page: fromPage === '' ? null : Number(fromPage),
        to_page: toPage === '' ? null : Number(toPage),
        date,
        is_private: isPrivate,
      });
      if (message) setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 홈 Composer와 같은 문법 — 입력은 박스 없이 종이 위에 바로, 옵션은
  // 헤어라인 아래 컨트롤 한 줄로. 라벨은 잉크색 작은 산세리프.
  return (
    <form onSubmit={handleSubmit}>
      {/* 원고 — 투명 텍스트 영역 두 장, 사이는 헤어라인 한 줄 */}
      <div className="divide-y divide-hairline">
        <div className="py-5">
          <label htmlFor="entry-quote" className="text-[11.5px] font-medium text-ink-faint">
            문장
          </label>
          <textarea
            id="entry-quote"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="책에서 마음에 남은 문장을 옮겨 적어보세요"
            rows={4}
            autoFocus={autoFocus}
            className="mt-2 block w-full resize-none border-b border-transparent bg-transparent font-serif text-[17px] leading-relaxed text-ink transition-colors placeholder:text-ink-faint focus:border-hairline-strong focus:outline-none"
          />
        </div>
        <div className="py-5">
          <label htmlFor="entry-note" className="text-[11.5px] font-medium text-ink-faint">
            생각
          </label>
          <textarea
            id="entry-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="이 문장에 대한 생각, 혹은 오늘의 감상"
            rows={4}
            className="mt-2 block w-full resize-none border-b border-transparent bg-transparent font-serif text-[15px] leading-relaxed text-ink transition-colors placeholder:text-ink-faint focus:border-hairline-strong focus:outline-none"
          />
        </div>
      </div>

      {/* 컨트롤 행 — 쪽수·날짜는 조용한 인라인 입력, 공개 여부는 칩.
          좁은 화면에선 자연 줄바꿈 대신 줄을 의도적으로 나눈다: ① 쪽수·날짜 ② 비공개 칩(왼쪽)·부가 동작(오른끝)
          ③ 전폭 저장 버튼. 넓어지면 전부 한 줄로 합쳐지고 저장 버튼은 오른끝에 붙는다. */}
      <div className="border-t border-hairline pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
          {/* 좁은 화면에선 쪽수 왼끝·날짜 오른끝, 넓어지면 붙어서 구분선 하나로 나뉜다 */}
          <div className="flex items-center justify-between sm:justify-start sm:gap-4">
            <div className="flex items-center gap-1 text-[13px] tabular-nums text-ink-sub">
              <span className="text-ink-faint">p.</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label="시작 페이지"
                placeholder="10"
                value={fromPage}
                onChange={(e) => setFromPage(e.target.value)}
                className="w-11 border-b border-transparent bg-transparent text-center text-ink placeholder:text-ink-faint focus:border-hairline-strong focus:outline-none"
              />
              <span className="text-ink-faint">–</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label="종료 페이지"
                placeholder="25"
                value={toPage}
                max={totalPages ?? undefined}
                onChange={(e) => setToPage(e.target.value)}
                className="w-11 border-b border-transparent bg-transparent text-center text-ink placeholder:text-ink-faint focus:border-hairline-strong focus:outline-none"
              />
            </div>

            <span aria-hidden className="hidden h-4 w-px bg-hairline sm:block" />

            <input
              type="date"
              aria-label="읽은 날짜"
              value={date}
              max={todayKST()}
              onChange={(e) => setDate(e.target.value)}
              className="border-b border-transparent bg-transparent text-[13px] tabular-nums text-ink-sub transition-colors focus:border-hairline-strong focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-start sm:gap-4">
            {/* 한 줄로 합쳐질 때만 날짜와 칩 사이에 구분선 */}
            <span aria-hidden className="hidden h-4 w-px bg-hairline sm:block" />

            <Chip
              selected={isPrivate}
              aria-pressed={isPrivate}
              onClick={() => setIsPrivate((v) => !v)}
            >
              <Lock size={12} strokeWidth={1.75} aria-hidden />
              비공개
            </Chip>

            {secondaryAction}
          </div>

          <Button
            type="submit"
            size="md"
            className="w-full sm:ml-auto sm:h-8 sm:w-auto sm:px-4 sm:text-caption"
            disabled={isSubmitting}
          >
            {isSubmitting ? '남기는 중...' : submitLabel}
          </Button>
        </div>

        {error && <p className="mt-3 text-caption font-medium text-danger">{error}</p>}
      </div>
    </form>
  );
}
