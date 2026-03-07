'use client';

import { useState } from 'react';
import EntryCard from '@/components/EntryCard';
import { MyBook } from '@/types/book';
import { EntryDetailData } from '@/types/entry';
import Image from 'next/image';
import MarkAsFinishedButton from './MarkAsFinishedButton';
import { Profile } from '@/types/profile';
import AnimatedListSection from '../ui/AnimatedListSecion';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import Card from '@/components/ui/Card';

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
  const { books, progress, last_read_page, book_id, id } = userBook;
  const { title, author, total_pages, cover_url } = books;

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
        <div className="flex items-center justify-between">
          <h2 className="text-section-title text-label dark:text-label-invert">📓 독서 기록</h2>
          {!isFriend && (
            <a
              href={`/protected/books/${book_id}/entry/new`}
              className="inline-block bg-tint text-white px-4 py-2 rounded hover:bg-tint-hover text-sm"
            >
              ➕ 기록 추가하기
            </a>
          )}
        </div>

        {entries && entries.length > 0 ? (
          <AnimatedListSection>
            {entries.map((data) => (
              <li key={data.entry.id}>
                <EntryCard
                  id={data.entry.id}
                  summary={data.entry.summary ?? ''}
                  date={data.entry.date}
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
