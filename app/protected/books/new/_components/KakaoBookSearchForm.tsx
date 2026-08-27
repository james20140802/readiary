'use client';

import { useState } from 'react';
import { BookSearchResult } from '@/types/book';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { searchBook } from '@/lib/books/searchBook';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Search } from 'lucide-react';
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
      // 페이지 수 조회가 아예 실패해도 등록은 가능해야 한다 — 모달을 열고 수동 입력으로 넘긴다
      console.error(e);
      setTotalPages(null);
      setShowModal(true);
    }
  };

  const handleConfirm = async () => {
    if (!selectedBook) return;
    let pages: number | null = totalPages;
    if (pages == null && manualTotalPages.trim() !== '') {
      const parsed = parseInt(manualTotalPages, 10);
      if (isNaN(parsed) || parsed <= 0) {
        toast.error('페이지 수는 1 이상의 숫자여야 합니다');
        return;
      }
      pages = parsed;
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
        router.push(`/protected/books/`);
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
          placeholder="책 제목 혹은 ISBN을 입력하세요"
          className="w-full px-4 py-2 text-body rounded-lg bg-card-raised border border-hairline text-ink focus:ring-2 focus:ring-accent/30 outline-none transition-all"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-accent hover:bg-accent-hover text-card text-button px-4 py-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
        >
          <Search size={20} />
        </button>
      </div>

      {results.length === 0 && !loading && query !== '' && hasSearched && (
        <div className="flex justify-center items-center py-8">
          <p className="text-sm text-ink-sub">검색 결과가 없습니다.</p>
        </div>
      )}
      <ul className="space-y-4">
        {results.map((book) => {
          const isDisabled = selectedBook && selectedBook.isbn !== book.isbn;

          return (
            <Card
              key={book.isbn}
              onClick={() => handleSelect(book)}
              className={`flex items-center gap-4 cursor-pointer transition-opacity ${
                isDisabled ? 'opacity-50 pointer-events-none' : ''
              }`}
              hoverable
              disabled={isDisabled ?? false}
            >
              <Image
                src={book.thumbnail || '/images/default-book-cover.png'}
                alt={book.title}
                width={56}
                height={80}
                className="object-cover rounded"
              />
              <div className="text-sm">
                <div className="font-medium text-ink">{book.title}</div>
                <div className="text-ink-sub">{book.authors?.join(', ')}</div>
                <div className="text-xs text-ink-faint">ISBN: {book.isbn.split(' ').join(', ')}</div>
              </div>
            </Card>
          );
        })}
      </ul>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedBook(null);
          setTotalPages(null);
        }}
      >
        <div className="bg-card p-5 rounded-2xl space-y-4 w-full max-w-sm mx-auto">
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
              <div className="font-semibold text-ink mb-1">
                {selectedBook?.title}
              </div>
              <div className="text-ink-sub mb-1">
                {selectedBook?.authors?.join(', ')}
              </div>
              {selectedBook?.isbn && (
                <div className="text-xs text-ink-sub mb-1">
                  ISBN: {selectedBook.isbn.split(' ').join(', ')}
                </div>
              )}
              {totalPages ? (
                <p className="text-ink">
                  총 페이지 수: <strong>{totalPages}</strong>
                </p>
              ) : (
                <div className="mt-2">
                  <p className="mb-1 text-ink">
                    페이지 수를 찾지 못했어요. 몰라도 등록할 수 있습니다.
                  </p>
                  <input
                    type="number"
                    value={manualTotalPages}
                    onChange={(e) => setManualTotalPages(e.target.value)}
                    placeholder="총 페이지 수 (선택)"
                    className="w-full px-4 py-2 text-body rounded-lg bg-card-raised border border-hairline text-ink focus:ring-2 focus:ring-accent/30 outline-none transition-all"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setSelectedBook(null);
                setTotalPages(null);
              }}
            >
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
