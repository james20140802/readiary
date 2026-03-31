'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { MyBook } from '@/types/book';
import Card from '@/components/ui/Card';
import AnimatedListSection from '../ui/AnimatedListSecion';
import { BookOpen, LayoutList, LayoutGrid, ChevronDown } from 'lucide-react';

interface Props {
  books: MyBook[];
  isFriend?: boolean;
  nicknameAndTag?: string;
}

type ViewMode = 'list' | 'grid';
type FilterMode = 'all' | 'reading' | 'finished';
type SortMode = 'recent' | 'progress_asc' | 'progress_desc' | 'title';

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'reading', label: '읽는 중' },
  { value: 'finished', label: '완독' },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'recent', label: '최근 등록순' },
  { value: 'progress_desc', label: '진행률 높은순' },
  { value: 'progress_asc', label: '진행률 낮은순' },
  { value: 'title', label: '제목순' },
];

function ProgressBar({ progress, isFinished }: { progress: number; isFinished: boolean }) {
  const pct = isFinished ? 100 : progress;
  return (
    <div className="space-y-1 w-full">
      <div className="flex justify-between items-center">
        <span className="text-caption text-label-muted">{isFinished ? '완독' : '진행률'}</span>
        <span className={`text-caption font-bold ${isFinished ? 'text-success' : 'text-tint'}`}>
          {pct}%
        </span>
      </div>
      <div className="w-full bg-border dark:bg-dark-border rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isFinished ? 'bg-success' : 'bg-tint'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BookList({ books, isFriend = false, nicknameAndTag = '' }: Props) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('recent');
  const [sortOpen, setSortOpen] = useState(false);

  const processed = useMemo(() => {
    let list = [...books];
    if (filter === 'reading') list = list.filter((b) => !b.is_finished);
    else if (filter === 'finished') list = list.filter((b) => b.is_finished);
    if (sort === 'progress_desc') list.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
    else if (sort === 'progress_asc') list.sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0));
    else if (sort === 'recent')
      list.sort(
        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
    else if (sort === 'title')
      list.sort((a, b) => (a.books.title ?? '').localeCompare(b.books.title ?? ''));
    return list;
  }, [books, filter, sort]);

  const getDetailHref = (userBook: MyBook) =>
    isFriend && nicknameAndTag !== ''
      ? `/protected/social/u/${nicknameAndTag}/books/${userBook.book_id}`
      : `/protected/books/${userBook.book_id}`;

  if (!books || books.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-border dark:border-dark-border rounded-xl">
        <BookOpen size={32} className="text-label-muted" />
        <p className="text-body-sm font-medium text-label dark:text-label-invert">
          아직 등록한 책이 없어요
        </p>
        {!isFriend && (
          <Link
            href="/protected/books/new"
            className="text-caption font-semibold text-tint hover:text-tint-hover"
          >
            첫 번째 책 등록하기 →
          </Link>
        )}
      </div>
    );

  return (
    <div>
      {/* ── 툴바 ── */}
      <div className="flex items-center justify-between gap-2 mb-4">
        {/* 필터 탭 */}
        <div className="flex items-center gap-1 bg-surface-raised dark:bg-dark-raised p-1 rounded-lg border border-border dark:border-dark-border">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-2.5 py-1 rounded-md text-caption font-semibold transition-all ${
                filter === opt.value
                  ? 'bg-surface dark:bg-dark-surface text-label dark:text-label-invert shadow-card'
                  : 'text-label-muted hover:text-label-sub'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 우측: 정렬 + 뷰 토글 */}
        <div className="flex items-center gap-2">
          {/* 정렬 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border dark:border-dark-border bg-surface dark:bg-dark-surface text-caption font-medium text-label-sub dark:text-label-muted hover:border-border-strong transition-all"
            >
              <span className="hidden sm:inline">
                {SORT_OPTIONS.find((o) => o.value === sort)?.label}
              </span>
              <ChevronDown
                size={13}
                className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-xl shadow-card-lg overflow-hidden min-w-[130px]">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSort(opt.value);
                        setSortOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-caption transition-colors ${
                        sort === opt.value
                          ? 'text-tint font-semibold bg-tint-subtle dark:bg-tint/10'
                          : 'text-label-sub dark:text-label-muted hover:bg-surface-raised dark:hover:bg-dark-raised'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 뷰 토글 */}
          <div className="flex items-center gap-0.5 bg-surface-raised dark:bg-dark-raised p-1 rounded-lg border border-border dark:border-dark-border">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-surface dark:bg-dark-surface text-label dark:text-label-invert shadow-card'
                  : 'text-label-muted hover:text-label-sub'
              }`}
              aria-label="리스트 뷰"
            >
              <LayoutList size={15} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid'
                  ? 'bg-surface dark:bg-dark-surface text-label dark:text-label-invert shadow-card'
                  : 'text-label-muted hover:text-label-sub'
              }`}
              aria-label="그리드 뷰"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 필터 결과 없음 */}
      {processed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <BookOpen size={28} className="text-label-muted" />
          <p className="text-body-sm text-label-muted">
            {filter === 'reading' ? '읽는 중인 책이 없어요' : '완독한 책이 없어요'}
          </p>
        </div>
      )}

      {/* ── 리스트 뷰 ── */}
      {viewMode === 'list' && processed.length > 0 && (
        <AnimatedListSection>
          {processed.map((userBook) => {
            const book = userBook.books;
            const progress = userBook.progress ?? 0;
            const isFinished = userBook.is_finished;

            return (
              <li key={userBook.id}>
                <Link href={getDetailHref(userBook)}>
                  <Card hoverable className="p-3">
                    <div className="flex gap-4 items-center">
                      {/* 표지 */}
                      <div className="relative w-[72px] h-[100px] shrink-0 rounded-lg overflow-hidden shadow-card-md">
                        <Image
                          src={book.cover_url ?? '/images/default-book-cover.png'}
                          alt={book.title}
                          fill
                          className="object-cover"
                          sizes="72px"
                        />
                        {isFinished && (
                          <div className="absolute top-1.5 right-1.5 bg-tint/90 text-white text-[9px] font-black px-1 py-0.5 rounded">
                            DONE
                          </div>
                        )}
                      </div>

                      {/* 정보 */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-[100px] py-1">
                        {/* 상단: 제목 + 기록하기 버튼 (같은 행) */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="text-body font-semibold text-label dark:text-label-invert line-clamp-2 leading-snug">
                              {book.title}
                            </h2>
                            <p className="text-body-sm text-label-muted mt-0.5 truncate">
                              {book.author}
                            </p>
                          </div>
                          {/* 기록하기: 오른쪽 상단 고정, 완독이면 invisible로 공간 유지 */}
                          {!isFriend && (
                            <div className="shrink-0 mt-0.5">
                              {!isFinished ? (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    router.push(`/protected/books/${userBook.book_id}/entry/new`);
                                  }}
                                  className="text-caption font-semibold text-tint bg-tint-subtle dark:bg-tint/10 hover:bg-tint/20 px-2.5 py-1 rounded-full border border-tint/20 transition-colors whitespace-nowrap"
                                >
                                  + 기록
                                </button>
                              ) : (
                                <span className="invisible text-caption px-2.5 py-1 whitespace-nowrap">
                                  + 기록
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 하단: 진행률 바 (항상 동일 위치) */}
                        <ProgressBar progress={progress} isFinished={isFinished || false} />
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </AnimatedListSection>
      )}

      {/* ── 그리드 뷰 ── */}
      {viewMode === 'grid' && processed.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {processed.map((userBook) => {
            const book = userBook.books;
            const isFinished = userBook.is_finished;

            return (
              <Link key={userBook.id} href={getDetailHref(userBook)} className="group block">
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-card border border-border dark:border-dark-border group-hover:shadow-card-md group-hover:-translate-y-1 transition-all duration-200">
                  <Image
                    src={book.cover_url ?? '/images/default-book-cover.png'}
                    alt={book.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 33vw, 25vw"
                  />
                  {isFinished && (
                    <div className="absolute top-2 right-2 bg-tint/90 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-lg">
                      <span className="text-[9px] font-black tracking-tighter">DONE</span>
                    </div>
                  )}
                </div>
                <p className="mt-1.5 text-caption font-medium text-label-sub dark:text-label-muted truncate px-0.5 group-hover:text-label dark:group-hover:text-label-invert transition-colors">
                  {book.title}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
