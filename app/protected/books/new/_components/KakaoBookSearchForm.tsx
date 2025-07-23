'use client';

import { useState } from 'react';
import { BookSearchResult } from '@/types/book';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { searchBook } from '@/lib/books/searchBook';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { MdSearch } from 'react-icons/md';
import Image from 'next/image';

export default function KakaoBookSearchForm() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [manualTotalPages, setManualTotalPages] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const router = useRouter();

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await searchBook(query);
      setResults(data);
    } catch (e) {
      toast.error('검색 실패');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (book: BookSearchResult) => {
    setSelectedBook(book);
    try {
      const res = await fetch('/api/books/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: book.url }),
      });

      const { totalPages } = await res.json();

      if (totalPages) {
        setTotalPages(totalPages);
      } else {
        setTotalPages(null);
      }
      setShowModal(true);
    } catch (e) {
      console.error(e);
      toast.error('페이지 수 가져오기 실패');
    }
  };

  const handleConfirm = async () => {
    if (!selectedBook) return;
    const pages = totalPages ?? parseInt(manualTotalPages);
    if (!pages || isNaN(pages)) {
      toast.error('유효한 페이지 수를 입력해주세요');
      return;
    }

    try {
      const registerRes = await fetch('/api/books/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedBook.title,
          author: selectedBook.authors?.join(', ') ?? '',
          isbn: selectedBook.isbn,
          cover_url: selectedBook.thumbnail,
          total_pages: pages,
        }),
      });

      const result = await registerRes.json();

      if (registerRes.ok && result?.success) {
        toast.success('책이 등록되었습니다');
        router.push(`/protected/books/${result.bookId}`);
      } else {
        toast.error(result?.message ?? '등록에 실패했습니다');
      }
    } catch (e) {
      console.error(e);
      toast.error('등록에 실패했습니다');
    } finally {
      setShowModal(false);
      setSelectedBook(null);
      setTotalPages(null);
      setManualTotalPages('');
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHasSearched(false);
          }}
          placeholder="책 제목을 입력하세요"
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:text-white"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600"
        >
          <MdSearch size={20} />
        </button>
      </div>

      {results.length === 0 && !loading && query !== '' && hasSearched && (
        <div className="flex justify-center items-center py-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">검색 결과가 없습니다.</p>
        </div>
      )}
      <ul className="space-y-4">
        {results.map((book) => (
          <Card
            key={book.isbn}
            onClick={() => handleSelect(book)}
            className="flex items-center gap-4 cursor-pointer"
            hoverable
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={book.thumbnail || '/images/default-book-cover.png'}
              alt={book.title}
              className="w-14 h-20 object-cover rounded"
            />
            <div className="text-sm">
              <div className="font-medium text-gray-900 dark:text-white">{book.title}</div>
              <div className="text-gray-500 dark:text-gray-400">{book.authors?.join(', ')}</div>
              <div className="text-xs text-gray-400">ISBN: {book.isbn.split(' ').join(', ')}</div>
            </div>
          </Card>
        ))}
      </ul>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg space-y-4 w-full max-w-sm mx-auto">
          {/* Modal Book Info Block */}
          <div className="flex items-start gap-4">
            <Image
              src={selectedBook?.thumbnail || '/images/default-book-cover.png'}
              alt={selectedBook?.title || '책 커버'}
              width={64}
              height={96}
              className="rounded object-cover"
            />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-gray-900 dark:text-white mb-1">
                {selectedBook?.title}
              </div>
              <div className="text-gray-600 dark:text-gray-300 mb-1">
                {selectedBook?.authors?.join(', ')}
              </div>
              {selectedBook?.isbn && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  ISBN: {selectedBook.isbn.split(' ').join(', ')}
                </div>
              )}
              {totalPages ? (
                <p className="text-gray-700 dark:text-gray-200">
                  총 페이지 수: <strong>{totalPages}</strong>
                </p>
              ) : (
                <div className="mt-2">
                  <p className="mb-1 text-gray-700 dark:text-gray-200">
                    페이지 수를 찾을 수 없습니다. 직접 입력해주세요:
                  </p>
                  <input
                    type="number"
                    value={manualTotalPages}
                    onChange={(e) => setManualTotalPages(e.target.value)}
                    placeholder="총 페이지 수"
                    className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={handleConfirm}>
              등록
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
