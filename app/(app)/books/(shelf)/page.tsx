import { fetchBooksPage } from '@/lib/queries/fetchBooksPage';
import { todayKST } from '@/lib/dates';
import { shelfExcerptLine } from '@/lib/monthly-excerpt/model';
import { fetchMyExcerptYears } from '@/lib/monthly-excerpt/server';
import BooksView from '@/components/books/BooksView';

export default async function MyBooksPage() {
  // 달의 발췌집 한 줄은 기다리지 않는다 — 도착하면 나타나고, 실패하면 그 줄만 빠진다
  const excerptLine = fetchMyExcerptYears()
    .then(shelfExcerptLine)
    .catch(() => null);
  const { books, stats } = await fetchBooksPage();
  return <BooksView books={books} stats={stats} today={todayKST()} excerptLine={excerptLine} />;
}
