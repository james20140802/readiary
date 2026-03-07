'use client';

import { useState } from 'react';
import NewBookForm from './_components/NewBookForm';
import KakaoBookSearchForm from './_components/KakaoBookSearchForm';
import Tabs from '@/components/ui/Tabs';
import AnimatedSection from '@/components/ui/AnimatedSection';
import BackButton from '@/components/ui/BackButton';

export default function NewBookPage() {
  const [tab, setTab] = useState<'manual' | 'search'>('search');

  return (
    <div className="w-full">
      <header className="flex items-center mb-6">
        <BackButton />
        <h1 className="text-page-title text-label dark:text-label-invert ml-4">📗 책 등록</h1>
      </header>

      <Tabs
        tabs={[
          { value: 'search', label: '🔍 책 검색' },
          { value: 'manual', label: '✍️ 직접 입력' },
        ]}
        defaultValue={'search'}
        onChange={(id) => setTab(id as 'manual' | 'search')}
        fullWidth
      />

      <div className="mt-6">
        <AnimatedSection key={tab}>
          {tab === 'search' ? <KakaoBookSearchForm /> : <NewBookForm />}
        </AnimatedSection>
      </div>
    </div>
  );
}
