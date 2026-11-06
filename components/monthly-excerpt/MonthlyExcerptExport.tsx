'use client';

import ExportExcerptsButton from '@/components/books/ExportExcerptsButton';
import { bookTallyForDisplay } from '@/lib/monthly-excerpt/model';
import { monthLabel } from '@/lib/monthly-excerpt/month';
import type { ExcerptItem, MonthKey } from '@/lib/monthly-excerpt/types';

/** 카드 한 장 표지에 들어가는 책 수. 나머지는 '외 N권'으로 묶는다 */
const COVER_BOOKS = 4;

interface MonthlyExcerptExportProps {
  month: MonthKey;
  items: ExcerptItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 달의 발췌집을 이미지로 내보낸다. 책별 내보내기 시트를 그대로 쓰고 표지에 달과 책, 장마다 책 이름을 넣는다.
 * 이미지는 앱 밖으로 나가므로 비공개 문장이 들어 있으면 먼저 알린다. 내 화면에서만 쓴다.
 */
export default function MonthlyExcerptExport({
  month,
  items,
  open,
  onOpenChange,
}: MonthlyExcerptExportProps) {
  const label = monthLabel(month);
  return (
    <ExportExcerptsButton
      bookTitle={label}
      author={null}
      quotes={items.map((item) => ({
        id: item.entryId,
        date: item.date,
        quote: item.quote,
        bookTitle: item.book.title,
      }))}
      // 달이 표제에 있으므로 읽은 기간은 찍지 않는다
      entryDates={[]}
      monthly={{ label, books: bookTallyForDisplay(items, COVER_BOOKS) }}
      notice={items.some((item) => item.isPrivate) ? '비공개 문장이 포함돼요' : undefined}
      open={open}
      onOpenChange={onOpenChange}
      hideTrigger
    />
  );
}
