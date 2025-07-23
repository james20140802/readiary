'use client';

import { useState } from 'react';
import NewBookForm from './_components/NewBookForm';
import KakaoBookSearchForm from './_components/KakaoBookSearchForm';
import Tabs from '@/components/ui/Tabs';

export default function NewBookPage() {
  const [tab, setTab] = useState<'manual' | 'search'>('search');

  return (
    <div>
      <h1 className="text-page-title text-label dark:text-white mb-6">📗 책 등록</h1>

      <Tabs
        tabs={[
          { value: 'search', label: '🔍 책 검색' },
          { value: 'manual', label: '✍️ 직접 입력' },
        ]}
        defaultValue={'search'}
        onChange={(id) => setTab(id as 'manual' | 'search')}
        fullWidth
      />

      <div className="mt-6">{tab === 'search' ? <KakaoBookSearchForm /> : <NewBookForm />}</div>
    </div>
  );
}
