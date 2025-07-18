import Link from 'next/link';
import { fetchMyBooksData } from '@/lib/queries/fetchBooks';
import { redirect } from 'next/navigation';

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

        {!books || books.length === 0 ? (
          <div className="text-center text-gray-700 dark:text-gray-300 space-y-2">
            <p>아직 등록한 책이 없습니다.</p>
            <Link
              href="/protected/books/new"
              className="text-blue-600 dark:text-blue-400 underline"
            >
              책 등록하러 가기
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {books.map((userBook) => {
              const book = userBook.books;
              const percent = book?.total_pages ? userBook.progress : 0;

              return (
                <li
                  key={userBook.id}
                  className="rounded-xl border p-4 bg-white dark:bg-gray-800 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {book?.title}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{book?.author}</p>
                      <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                        📖 {percent}% 진행 중
                      </p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Link
                        href={`/protected/books/${userBook.book_id}`}
                        className="text-sm px-3 py-1 h-8 min-w-[80px] bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center"
                      >
                        상세 보기
                      </Link>
                      <Link
                        href={`/protected/books/${userBook.book_id}/entry/new`}
                        className="text-sm px-3 py-1 h-8 min-w-[80px] bg-blue-500 text-white rounded flex items-center justify-center"
                      >
                        기록하기
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
