import { fetchBooksPage } from '@/lib/queries/fetchBooksPage';
import { todayKST } from '@/lib/dates';
import BooksView from '@/components/books/BooksView';

export default async function MyBooksPage() {
  const { books, stats } = await fetchBooksPage();
  return <BooksView books={books} stats={stats} today={todayKST()} />;
}
