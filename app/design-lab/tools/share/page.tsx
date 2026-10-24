import type { Metadata } from 'next';
import ShareEntryView from '@/components/tools/ShareEntryView';
import { labGuard, LAB_ROBOTS } from '../guard';

export const metadata: Metadata = { title: '공유받은 문장 견본', robots: LAB_ROBOTS };

export default async function ShareLabPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  labGuard();
  const { variant } = await searchParams;
  return (
    <ShareEntryView
      entry={{
        id: 'lab',
        quote: variant === 'note' ? null : '질문을 바꾸면 같은 하루도 다른 얼굴을 한다.',
        note:
          variant === 'quote'
            ? null
            : '오늘은 "왜"를 "어떻게"로 바꿔서 물어봤다. 조금 덜 억울해졌다.',
        date: '2026-10-06',
        bookTitle: '철학이 깊을수록 삶은 단순하다',
        bookAuthor: null,
        nickname: '윤서',
      }}
    />
  );
}
