import NewEntryForm from './_components/NewEntryForm';
import { fetchBookBasicInfo } from '@/lib/books/fetchBookBasicInfo';

export default async function NewEntryPage({ params }: { params: { book_id: string } }) {
  const detail = await fetchBookBasicInfo(params.book_id);
  if (!detail) return <p className="text-center text-red-500">등록된 책을 찾을 수 없습니다.</p>;

  return (
    <NewEntryForm
      userBookId={detail.userBookId}
      userId={detail.userId}
      book={detail.book}
      bookId={detail.book.id}
    />
  );
}
