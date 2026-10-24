'use client';

import EntryForm from '@/components/entries/EntryForm';

const BOOK = {
  id: 'lab-book',
  title: '에로스의 종말',
  author: '한병철',
  cover_url: null,
  total_pages: 128,
  isbn: null,
};

/** 기록 고치기 폼 견본 — 남기기를 누르면 저장하지 않고 안내만 보인다 */
export default function FormLab() {
  return (
    <EntryForm
      book={BOOK}
      heading="기록 고치기"
      submitLabel="고쳐 남기기"
      back={{ href: '/design-lab/entry', label: '기록' }}
      initial={{
        quote: '경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.',
        note: '가까워질수록 모르는 부분이 줄어드는 게 꼭 좋은 걸까.',
        fromPage: 42,
        toPage: 42,
        date: '2026-09-16',
        isPrivate: false,
      }}
      onSubmit={async () => '견본에서는 남기지 않아요.'}
    />
  );
}
