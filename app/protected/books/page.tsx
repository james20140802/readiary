import Link from 'next/link';
import { fetchMyBooksData } from '@/lib/queries/fetchBooks';
import { redirect } from 'next/navigation';
import Button from '@/components/ui/Button';
import BookList from '@/components/books/BookList';
import AnimatedSection from '@/components/ui/AnimatedSection';

export default async function MyBooksPage() {
  const books = await fetchMyBooksData();

  if (!books) return redirect('/');

  return (
    <div className="flex justify-center">
      <div className="w-full">
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
          <AnimatedSection>
            <p className="text-secondary text-center mt-10">등록한 책이 없어요. 📭</p>
          </AnimatedSection>
        ) : (
          <BookList books={books} />
        )}
      </div>
    </div>
  );
}
