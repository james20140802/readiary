'use client';

import { useEffect, useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';
import Image from 'next/image';
import { updateProgress } from '@/utils/sync';

export default function EntryDetailPage() {
  const params = useParams();
  const rawEntryId = params.entry_id;
  const entryId = Array.isArray(rawEntryId) ? rawEntryId[0] : rawEntryId;
  const supabase = createSupabaseClient();

  const router = useRouter();

  const [entry, setEntry] = useState<Database['public']['Tables']['entries']['Row'] | null>(null);
  const [book, setBook] = useState<Database['public']['Tables']['books']['Row'] | null>(null);
  const [loading, setLoading] = useState(true);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const fetchEntry = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId || !entryId) return;

      const { data, error } = await supabase
        .from('entries')
        .select(
          `
            id,
            summary,
            from_page,
            to_page,
            date,
            created_at,
            user_book_id,
            is_private,
            user_books (
              book_id,
              books (
                id,
                title,
                author,
                cover_url,
                total_pages,
                isbn
              )
            )
          `
        )
        .eq('id', entryId)
        .single();

      if (!error && data) {
        setEntry({
          id: data.id,
          summary: data.summary,
          from_page: data.from_page,
          to_page: data.to_page,
          date: data.date,
          created_at: data.created_at,
          user_book_id: data.user_book_id,
          is_private: data.is_private,
        });
        setBook({
          ...data.user_books.books,
          isbn: data.user_books.books?.isbn ?? '',
        });
      }

      setLoading(false);
    };

    fetchEntry();
  }, [entryId, supabase]);

  if (loading) {
    return <p className="p-4 text-gray-600">로딩 중...</p>;
  }

  if (!entry || !book) {
    return <p className="p-4 text-red-500">기록을 찾을 수 없습니다.</p>;
  }

  return (
    <Fragment>
      <div className="space-y-6">
        {/* 책 요약 정보 */}
        <div
          className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition"
          onClick={() => router.push(`/protected/books/${book.id}`)}
        >
          <Image
            src={book.cover_url ?? '/images/default-book-cover.png'}
            alt="Book cover"
            width={48}
            height={72}
            className="rounded shadow object-cover"
          />
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{book.title ?? '제목 없음'}</h2>
            <p className="text-sm text-gray-500">{book.author ?? '저자 미상'}</p>
          </div>
        </div>

        {/* 독서 기록 박스 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md space-y-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">✍️ 오늘의 독서 기록</h1>
          <p className="text-base text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
            {entry.summary ?? ''}
          </p>
          <hr className="border-t border-gray-200 dark:border-gray-700" />
          <p className="text-sm text-gray-500">
            📅 {entry.date ? new Date(entry.date).toLocaleDateString() : ''} | 📖{' '}
            {entry.from_page ?? ''}~{entry.to_page ?? ''}쪽
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => router.push(`/protected/entry/${entryId}/edit`)}
              className="px-4 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              수정하기
            </button>
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="px-4 py-1 text-sm rounded border border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-900 dark:border-red-600 dark:text-red-300"
            >
              삭제하기
            </button>
          </div>
        </div>
      </div>
      <Transition appear show={isDeleteDialogOpen} as={Fragment}>
        <Dialog onClose={() => setIsDeleteDialogOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed inset-0 flex items-start justify-center pt-24 px-4">
            <Transition.Child
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="mx-auto w-full max-w-md sm:max-w-lg md:max-w-xl rounded-lg bg-white dark:bg-gray-800 p-6 space-y-4 shadow-lg">
                <Dialog.Title className="text-lg font-bold text-gray-900 dark:text-white">
                  정말 삭제하시겠어요?
                </Dialog.Title>
                <Dialog.Description className="text-sm text-gray-500 dark:text-gray-300">
                  이 작업은 되돌릴 수 없습니다.
                </Dialog.Description>
                {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsDeleteDialogOpen(false)}
                    className="px-4 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    취소
                  </button>
                  <button
                    onClick={async () => {
                      setIsDeleting(true);
                      setDeleteError('');
                      if (!entryId) {
                        setDeleteError('삭제할 항목의 ID가 존재하지 않아요.');
                        setIsDeleting(false);
                        return;
                      }

                      const {
                        data: { user },
                        error: userError,
                      } = await supabase.auth.getUser();
                      if (!user || userError) {
                        setDeleteError('사용자 정보를 불러올 수 없어요.');
                        setIsDeleting(false);
                        return;
                      }

                      const { error } = await supabase.from('entries').delete().eq('id', entryId);
                      if (error) {
                        setDeleteError('삭제에 실패했어요. 다시 시도해주세요.');
                        setIsDeleting(false);
                      } else {
                        await updateProgress(book.id, user.id);
                        router.push(`/protected/books/${book.id}`);
                      }
                    }}
                    disabled={isDeleting}
                    className="px-4 py-1 text-sm rounded border border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-900 dark:border-red-600 dark:text-red-300 disabled:opacity-50"
                  >
                    {isDeleting ? '삭제 중...' : '삭제하기'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </Fragment>
  );
}
