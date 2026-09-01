import BackButton from '@/components/ui/BackButton';
import ExcerptBooklet from './ExcerptBooklet';
import ExportExcerptsButton from './ExportExcerptsButton';

interface ExcerptReaderProps {
  bookTitle: string;
  author: string | null;
  quotes: { id: string; date: string; quote: string }[];
  /** 읽기 기간 계산용 — 인용 없는 기록의 날짜도 포함한 전체 */
  entryDates: string[];
}

export default function ExcerptReader({
  bookTitle,
  author,
  quotes,
  entryDates,
}: ExcerptReaderProps) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="mb-6 flex items-center justify-between">
        <BackButton />
        {quotes.length > 0 && (
          <ExportExcerptsButton
            bookTitle={bookTitle}
            author={author}
            quotes={quotes}
            entryDates={entryDates}
          />
        )}
      </header>

      <ExcerptBooklet
        bookTitle={bookTitle}
        author={author}
        quotes={quotes}
        entryDates={entryDates}
      />
    </div>
  );
}
