'use client';

import { useState } from 'react';
import NewBookForm from './_components/NewBookForm';
import KakaoBookSearchForm from './_components/KakaoBookSearchForm';

export default function NewBookPage() {
  const [tab, setTab] = useState<'manual' | 'search'>('search');

  return (
    <div className="w-full max-w-xl mx-auto p-4">
      <h1 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-4">
        책 등록
      </h1>

      <div className="flex mb-6 border-b border-gray-300 dark:border-gray-700">
        <button
          onClick={() => setTab('search')}
          className={`flex-1 py-2 text-center text-sm ${
            tab === 'search'
              ? 'border-b-2 border-blue-500 font-semibold text-blue-500'
              : 'text-gray-400'
          }`}
        >
          🔍 책 검색
        </button>
        <button
          onClick={() => setTab('manual')}
          className={`flex-1 py-2 text-center text-sm ${
            tab === 'manual'
              ? 'border-b-2 border-blue-500 font-semibold text-blue-500'
              : 'text-gray-400'
          }`}
        >
          ✍️ 직접 입력
        </button>
      </div>

      {tab === 'search' ? <KakaoBookSearchForm /> : <NewBookForm />}
    </div>
  );
}
