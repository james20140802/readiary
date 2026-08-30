import Seal from '@/components/ui/Seal';
import BackButton from '@/components/ui/BackButton';

interface ExcerptReaderProps {
  bookTitle: string;
  author: string | null;
  quotes: { id: string; date: string; quote: string }[];
  lastDate: string | null;
}

export default function ExcerptReader({ bookTitle, author, quotes, lastDate }: ExcerptReaderProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <header className="flex items-center mb-6">
        <BackButton />
      </header>

      <section className="flex flex-col items-center text-center pb-10 border-b border-hairline">
        <Seal>발췌집</Seal>
        <h1 className="font-serif text-2xl text-ink mt-4">{bookTitle}</h1>
        {author && <p className="text-ink-sub mt-2">{author}</p>}
        <p className="font-sans text-seal text-accent uppercase mt-6">
          문장 {quotes.length}개{lastDate ? ` · 마지막 문장 ${lastDate.replaceAll('-', '.')}` : ''}
        </p>
      </section>

      {quotes.length > 0 ? (
        <div className="space-y-10 py-10">
          {quotes.map((q) => (
            <div key={q.id} className="text-center">
              <blockquote className="font-serif text-quote text-ink whitespace-pre-wrap">
                “{q.quote}”
              </blockquote>
              <p className="text-xs text-ink-faint mt-3">{q.date.replaceAll('-', '.')}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-ink-sub text-center py-10">
          옮겨 적은 문장이 없어요. 기록의 생각들은 책 상세에서 다시 볼 수 있어요.
        </p>
      )}
    </div>
  );
}
