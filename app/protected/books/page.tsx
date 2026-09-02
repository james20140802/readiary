import Link from 'next/link';
import { fetchMyBooksData } from '@/lib/queries/fetchBooks';
import { fetchBookReadingStats } from '@/lib/queries/fetchBookReadingStats';
import { redirect } from 'next/navigation';
import Button from '@/components/ui/Button';
import BookList from '@/components/books/BookList';

export default async function MyBooksPage() {
  const [books, stats] = await Promise.all([fetchMyBooksData(), fetchBookReadingStats()]);

  if (!books) return redirect('/');

  const finishedCount = books.filter((b) => b.is_finished).length;
  const readingCount = books.length - finishedCount;

  return (
    <div className="w-full">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-page-title text-ink">내 책장</h1>
          {books.length > 0 && (
            <p className="mt-1 text-[12.5px] tabular-nums text-ink-faint">
              읽는 중 {readingCount}
              <span className="mx-2 text-hairline-strong">·</span>
              완독 {finishedCount}
            </p>
          )}
        </div>
        <Button asChild size="sm" variant="primary">
          <Link href="/protected/books/new">책 등록</Link>
        </Button>
      </header>

      <BookList books={books} stats={stats} />
    </div>
  );
}
