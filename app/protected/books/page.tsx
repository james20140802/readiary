import Link from 'next/link';
import { fetchMyBooksData } from '@/lib/queries/fetchBooks';
import { redirect } from 'next/navigation';
import MyBookList from './_components/MyBookList';
import Button from '@/components/ui/Button';

export default async function MyBooksPage() {
  const books = await fetchMyBooksData();

  if (!books) return redirect('/');

  return (
    <div className="h-full flex justify-center">
      <div className="w-full max-w-2xl">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-page-title text-label dark:text-white" aria-label="내 책장">
            📚 내 책장
          </h1>
          <Button asChild>
            <Link href="/protected/books/new">+ 책 등록</Link>
          </Button>
        </header>

        {/* If MyBookList ever fetches data internally, wrap it in <Suspense> for smoother UX */}
        {books.length === 0 ? (
          <p className="text-secondary text-center mt-10">등록한 책이 없어요. 📭</p>
        ) : (
          <MyBookList books={books} />
        )}
      </div>
    </div>
  );
}
