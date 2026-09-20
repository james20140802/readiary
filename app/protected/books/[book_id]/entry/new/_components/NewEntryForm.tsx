'use client';

import { SessionExpiredError } from '@/lib/api/fetch';
import { useCreationSubmission } from '@/hooks/useCreationSubmission';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Book } from '@/types/book';
import EntryForm, { EntryFormValues } from '@/components/entries/EntryForm';

interface Props {
  userBookId: string;
  userId: string;
  book: Book;
  bookId: string;
}

export default function NewEntryForm({ userBookId, book, bookId }: Props) {
  const router = useRouter();
  const creation = useCreationSubmission<EntryFormValues & { user_book_id: string }>(
    `entry:${userBookId}`,
    '/api/entries/new',
    'client_entry_id'
  );

  const handleSubmit = async (values: EntryFormValues): Promise<string | null> => {
    try {
      const result = await creation.submit({ ...values, user_book_id: userBookId });
      if (!result) return '저장 준비 중입니다.';
      toast.success('기록을 남겼어요.');
      router.push(`/protected/books/${bookId}`);
      return null;
    } catch (error) {
      if (error instanceof SessionExpiredError) throw error;
      return error instanceof Error ? error.message : '저장 결과를 확인하지 못했어요.';
    }
  };

  if (!creation.ready)
    return (
      <p role="status">
        {creation.redirecting
          ? '로그인 화면으로 이동하는 중...'
          : (creation.error ?? '저장 준비를 확인하는 중...')}
      </p>
    );
  const restored = creation.snapshot?.payload;
  return (
    <EntryForm
      key={creation.accountId}
      successHref={`/protected/books/${bookId}`}
      book={book}
      heading="기록 남기기"
      submitLabel={creation.snapshot ? '저장 확인·재시도' : '남기기'}
      frozen={!!creation.snapshot}
      onSubmit={handleSubmit}
      initial={
        restored
          ? {
              quote: restored.quote ?? '',
              note: restored.note ?? '',
              fromPage: restored.from_page,
              toPage: restored.to_page,
              date: restored.date,
              isPrivate: restored.is_private,
            }
          : undefined
      }
    />
  );
}
