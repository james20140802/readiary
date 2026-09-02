'use client';

import { useState } from 'react';
import { BookSearchResult } from '@/types/book';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { searchBook } from '@/lib/books/searchBook';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Search } from 'lucide-react';
import Image from 'next/image';

/** 카카오 응답의 datetime('2021-08-02T00:00:00.000+09:00')에서 연도만 */
function publishedYear(datetime: string | undefined): string | null {
  const y = datetime?.slice(0, 4);
  return y && /^\d{4}$/.test(y) ? y : null;
}

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

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim() === '' || loading) return;
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

  const closeModal = () => {
    setShowModal(false);
    setSelectedBook(null);
    setTotalPages(null);
    setManualTotalPages('');
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
      closeModal();
    }
  };

  return (
    <div>
      {/* 검색 — 박스 대신 괘선 한 줄, 서체는 부리 */}
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-3 border-b border-hairline-strong"
      >
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHasSearched(false);
          }}
          placeholder="책 제목이나 ISBN"
          aria-label="책 검색"
          className="min-w-0 flex-1 bg-transparent py-2.5 font-serif text-[17px] text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          aria-label="검색"
          className="shrink-0 p-1 text-ink-sub transition-colors hover:text-ink disabled:text-ink-faint"
        >
          <Search size={18} strokeWidth={1.75} />
        </button>
      </form>

      {results.length === 0 && !loading && query !== '' && hasSearched && (
        <p className="py-10 text-center font-serif text-[14px] text-ink-faint">
          검색 결과가 없습니다.
        </p>
      )}

      {/* 결과 — 조용한 리스트. 한 권을 고르면 나머지는 뒤로 물러난다 */}
      <ul className="mt-2 divide-y divide-hairline">
        {results.map((book) => {
          const isDimmed = selectedBook != null && selectedBook.isbn !== book.isbn;
          const meta = [book.authors?.join(', '), book.publisher, publishedYear(book.datetime)]
            .filter(Boolean)
            .join(' · ');

          return (
            <li key={book.isbn}>
              <button
                type="button"
                onClick={() => handleSelect(book)}
                disabled={isDimmed}
                className={`group flex w-full items-center gap-4 py-3.5 text-left transition-opacity ${
                  isDimmed ? 'opacity-40' : ''
                }`}
              >
                <Image
                  src={book.thumbnail || '/images/default-book-cover.png'}
                  alt=""
                  width={40}
                  height={56}
                  className="h-14 w-10 shrink-0 rounded-sm border border-hairline object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-[15px] leading-snug text-ink group-hover:underline group-hover:decoration-hairline-strong group-hover:underline-offset-4">
                    {book.title}
                  </p>
                  <p className="mt-0.5 truncate text-caption text-ink-faint">{meta}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <Modal isOpen={showModal} onClose={closeModal}>
        <div className="flex items-start gap-5">
          <Image
            src={selectedBook?.thumbnail || '/images/default-book-cover.png'}
            alt=""
            width={64}
            height={96}
            className="h-24 w-16 shrink-0 rounded-sm border border-hairline object-cover"
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="font-serif text-[17px] font-bold leading-snug text-ink">
              {selectedBook?.title}
            </p>
            <p className="mt-1 font-serif text-[13px] text-ink-sub">
              {selectedBook?.authors?.join(', ')}
            </p>
            {totalPages ? (
              <p className="mt-4 text-[12.5px] tabular-nums text-ink-faint">총 {totalPages}쪽</p>
            ) : (
              <div className="mt-4">
                <label className="flex items-center gap-1 text-[12.5px] tabular-nums text-ink-sub">
                  <span className="text-ink-faint">총</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={manualTotalPages}
                    onChange={(e) => setManualTotalPages(e.target.value)}
                    placeholder="?"
                    aria-label="총 쪽수"
                    className="w-14 border-b border-hairline-strong bg-transparent text-center text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
                  />
                  <span className="text-ink-faint">쪽</span>
                </label>
                <p className="mt-1.5 text-[11.5px] text-ink-faint">
                  쪽수를 찾지 못했어요. 몰라도 꽂을 수 있습니다.
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={closeModal}>
            돌아가기
          </Button>
          <Button variant="primary" size="sm" onClick={handleConfirm}>
            책장에 꽂기
          </Button>
        </div>
      </Modal>
    </div>
  );
}
