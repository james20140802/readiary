'use client';

import { useState, useMemo } from 'react';
import EntryCard from '@/components/EntryCard';
import { MyBook } from '@/types/book';
import { EntryDetailData } from '@/types/entry';
import Image from 'next/image';
import MarkAsFinishedButton from './MarkAsFinishedButton';
import { Profile } from '@/types/profile';
import AnimatedListSection from '../ui/AnimatedListSecion';
import { BookOpen, CheckCircle2, Plus, ChevronDown } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '../ui/Button';
import Link from 'next/link';

interface Props {
  userBook: MyBook;
  entries: EntryDetailData[] | null;
  userId?: string;
  isFriend?: boolean;
  friendProfile?: Profile;
}

export default function BookDetailContent({
  userBook,
  entries,
  userId,
  isFriend = false,
  friendProfile,
}: Props) {
  const [isFinished, setIsFinished] = useState(userBook.is_finished);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOption, setFilterOption] = useState<'all' | 'public' | 'private'>('all');

  const SORT_OPTIONS: { value: 'desc' | 'asc'; label: string }[] = [
    { value: 'desc', label: '최신순' },
    { value: 'asc', label: '오래된순' },
  ];

  const FILTER_OPTIONS: { value: 'all' | 'public' | 'private'; label: string }[] = [
    { value: 'all', label: '전체' },
    { value: 'public', label: '공개' },
    { value: 'private', label: '비공개' },
  ];

  const { books, progress, last_read_page, book_id, id } = userBook;
  const { title, author, total_pages, cover_url } = books;

  const sortedEntries = useMemo(() => {
    if (!entries) return null;
    
    // 1. 먼저 필터링
    let processed = [...entries];
    if (filterOption === 'public') {
      processed = processed.filter(e => !e.entry.is_private);
    } else if (filterOption === 'private') {
      processed = processed.filter(e => e.entry.is_private);
    }

    // 2. 이어서 정렬
    return processed.sort((a, b) => {
      const dateA = new Date(a.entry.date).getTime();
      const dateB = new Date(b.entry.date).getTime();
      if (dateA !== dateB) {
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }
      const createdA = new Date(a.entry.created_at).getTime();
      const createdB = new Date(b.entry.created_at).getTime();
      return sortOrder === 'desc' ? createdB - createdA : createdA - createdB;
    });
  }, [entries, filterOption, sortOrder]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col sm:flex-row sm:items-start sm:gap-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-stretch sm:gap-10 w-full">
          <div className="flex-shrink-0 self-center sm:self-start">
            <div className="relative group shadow-2xl">
              <Image
                src={cover_url ?? '/images/default-book-cover.png'}
                alt="Book cover"
                width={128}
                height={192}
                className="rounded shadow object-cover w-32 sm:w-24"
              />
              <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
            </div>
          </div>

          <div className="w-full flex flex-col mt-8 sm:mt-0 justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-label dark:text-label-invert leading-tight tracking-tight">
                {title}
              </h1>
              <p className="text-label-muted mt-2 text-lg">{author}</p>
            </div>

            <div className="mt-8 space-y-6">
              <div className="space-y-3">
                <div className="w-full bg-border dark:bg-dark-border rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-tint h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold tracking-widest text-label-muted uppercase">
                  <span>
                    {last_read_page} / {total_pages} PAGES
                  </span>
                  <span className="text-tint">{progress}% COMPLETED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="pt-2">
        {!isFriend &&
          (!isFinished ? (
            <Card className="flex flex-row items-center gap-4 group/action">
              <div className="p-2 bg-surface-raised dark:bg-dark-raised rounded-xl text-label-muted group-hover/action:text-tint transition-colors">
                <BookOpen size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs text-label-muted font-medium leading-relaxed">
                  {progress && progress >= 90
                    ? '이제 마침표를 찍을 시간입니다.'
                    : progress && progress > 60
                      ? '완독이 눈앞에 보입니다.'
                      : progress && progress > 40
                        ? '어느덧 절반 정도 읽으셨어요.'
                        : progress && progress > 10
                          ? '조금씩 몰입하고 계시네요.'
                          : '새로운 탐험의 시작입니다.'}
                </p>
              </div>
              <MarkAsFinishedButton
                onFinish={() => setIsFinished(true)}
                userBookId={id}
                progress={progress ?? 0}
                userId={userId ?? ''}
              />
            </Card>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-success-subtle rounded-2xl border border-success-muted text-success animate-in fade-in slide-in-from-top-2 duration-500">
              <CheckCircle2 size={24} />
              <div>
                <p className="text-sm font-bold">완독한 도서입니다</p>
                <p className="text-[11px] text-success/70 font-medium">
                  축하합니다! 서재에 소중한 기록이 남았습니다.
                </p>
              </div>
            </div>
          ))}
      </div>

      <section className="space-y-4">
        {/* 전체 컨테이너: 데스크탑에서는 한 줄, 모바일에서는 여러 줄로 래핑 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          
          {/* 모바일 1줄: 타이틀 & 기록 추가 버튼 */}
          <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
            <h2 className="text-section-title text-label dark:text-label-invert">📓 독서 기록</h2>
            {!isFriend && (
              <span className="sm:hidden">
                <Link href={`/protected/books/${book_id}/entry/new`}>
                  <Button size="sm" variant="primary" className="flex items-center gap-1.5 px-3 py-1.5 text-xs">
                    <Plus size={14} />
                    기록 추가
                  </Button>
                </Link>
              </span>
            )}
          </div>

          {/* 데스크탑에서 필터와 추가 버튼을 하나로 묶음, 모바일에서는 아래로 */}
          <div className="flex flex-row items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto pb-1 sm:pb-0">
            {entries && entries.length > 0 && (
              <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                <div className="flex items-center gap-2">
                  {/* 공개 여부 필터 탭 */}
                  {!isFriend && (
                    <>
                      <div className="flex items-center bg-surface-raised dark:bg-dark-raised p-1 rounded-lg border border-border dark:border-dark-border shrink-0">
                        {FILTER_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setFilterOption(opt.value)}
                            className={`px-2.5 py-1 rounded-md text-caption font-semibold transition-all whitespace-nowrap ${
                              filterOption === opt.value
                                ? 'bg-surface dark:bg-dark-surface text-label dark:text-label-invert shadow-card'
                                : 'text-label-muted hover:text-label-sub'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* 구분을 위한 희미한 선 */}
                      <div className="w-px h-4 bg-border dark:bg-dark-border hidden sm:block" />
                    </>
                  )}
                </div>

                {/* 정렬 옵션 드롭다운 (모바일에서는 오른쪽 끝으로 밀림) */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setSortOpen((v) => !v)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border dark:border-dark-border bg-surface dark:bg-dark-surface text-caption font-medium text-label-sub dark:text-label-muted hover:border-border-strong transition-all"
                  >
                    <span className="inline">
                      {SORT_OPTIONS.find((o) => o.value === sortOrder)?.label}
                    </span>
                    <ChevronDown
                      size={13}
                      className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {sortOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                      <div className="absolute right-0 sm:left-0 top-full mt-1 z-20 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-xl shadow-card-lg overflow-hidden min-w-[100px]">
                        {SORT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setSortOrder(opt.value);
                              setSortOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-caption transition-colors ${
                              sortOrder === opt.value
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
              </div>
            )}

            {/* 데스크탑용 기록 추가 버튼 */}
            {!isFriend && (
              <span className="hidden sm:inline">
                <Link href={`/protected/books/${book_id}/entry/new`}>
                  <Button size="sm" variant="primary" className="flex items-center gap-1.5 shrink-0">
                    <Plus size={16} />
                    기록 추가하기
                  </Button>
                </Link>
              </span>
            )}
          </div>
        </div>

        {sortedEntries && sortedEntries.length > 0 ? (
          <AnimatedListSection>
            {sortedEntries.map((data) => (
              <li key={data.entry.id}>
                <EntryCard
                  id={data.entry.id}
                  summary={data.entry.summary ?? ''}
                  date={data.entry.date}
                  isPrivate={data.entry.is_private}
                  userId={userId}
                  href={
                    isFriend && friendProfile
                      ? `/protected/social/u/${friendProfile.nickname + '-' + friendProfile.tag}/entry/${data.entry.id}`
                      : undefined
                  }
                  initialCommentCount={data.initialCommentCount}
                  initialLikeCount={data.initialLikeCount}
                  initialLiked={data.initialLiked}
                />
              </li>
            ))}
          </AnimatedListSection>
        ) : (
          <p className="text-sm text-label-muted">아직 작성된 기록이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
