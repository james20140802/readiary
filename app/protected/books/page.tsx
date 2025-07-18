import Link from 'next/link';
import { fetchMyBooksData } from '@/lib/queries/fetchBooks';
import { redirect } from 'next/navigation';
import MyBookList from './_components/MyBookList';

export default async function MyBooksPage() {
  const books = await fetchMyBooksData();

  if (!books) return redirect('/');

  return (
    <div className="h-full flex justify-center">
      <div className="w-full max-w-2xl">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">📚 내 책장</h1>
          <Link
            href="/protected/books/new"
            className="bg-black text-white px-4 py-2 rounded-md text-sm shadow hover:bg-gray-800"
          >
            + 책 등록
          </Link>
        </header>

        <MyBookList />
      </div>
    </div>
  );
}
