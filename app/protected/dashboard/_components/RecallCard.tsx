'use client';
import Link from 'next/link';
import { useState } from 'react';
import EntryReader from '@/components/entries/EntryReader';
import Button from '@/components/ui/Button';
import PushSeen from '@/components/PushSeen';
import Card from '@/components/ui/Card';
import Seal from '@/components/ui/Seal';
import ClampedText from '@/components/ui/ClampedText';
import type { RecallEntry } from '@/lib/recall/fetchRecallEntry';

export function RecallCard({ recall }: { recall: RecallEntry }) {
  const [reading, setReading] = useState(false);
  const href = `/protected/entry/${recall.id}`;
  const label = recall.yearsAgo != null ? `${recall.yearsAgo}년 전 오늘` : '다시 꺼낸 문장';
  const meta = [recall.bookAuthor, recall.date.replaceAll('-', '. ') + '.']
    .filter(Boolean)
    .join(' · ');
  // 원문 읽기 버튼을 카드 위에 깔고, 계속 읽기·작성 링크는 형제로 배치한다.
  // 서로 다른 행동을 중첩하지 않아 키보드로 각각 선택할 수 있다.
  return (
    <>
      <Card hoverable variant="raised" className="relative px-[26px] pb-6 pt-[30px]">
        <PushSeen kind="recall" />
        <button
          type="button"
          onClick={() => setReading(true)}
          aria-label={`${recall.bookTitle}의 기록 보기`}
          className="absolute inset-0 rounded-[inherit]"
        />
        <Seal className="mb-3 block">{label}</Seal>
        <span
          aria-hidden
          className="mb-2 block font-serif text-quote-mark leading-none text-accent"
        >
          “
        </span>
        <ClampedText fadeFromClassName="from-card">
          <blockquote className="font-serif text-quote text-ink">{recall.quote}</blockquote>
        </ClampedText>
        <div className="mt-[18px] flex flex-wrap items-center justify-center gap-x-4 gap-y-3 border-t border-hairline pt-[14px]">
          <div className="flex min-w-0 max-w-full flex-auto basis-auto flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-serif text-caption font-bold text-ink">{recall.bookTitle}</span>
            <span className="text-caption text-ink-faint">{meta}</span>
          </div>
          <Button variant="secondary" className="relative z-10 shrink-0" asChild>
            <Link href={`${href}?reflect=1#reflections`}>지금의 생각 남기기</Link>
          </Button>
        </div>
      </Card>
      {reading && <EntryReader entryId={recall.id} onClose={() => setReading(false)} />}
    </>
  );
}
