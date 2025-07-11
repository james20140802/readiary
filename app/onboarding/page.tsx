'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';

const generateRandomTag = () => Math.floor(1000 + Math.random() * 9000).toString();

export default function OnboardingPage() {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const supabase = createSupabaseClient();

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
      setError('닉네임은 영어 알파벳과 숫자, 언더스코어(_)만 사용할 수 있습니다.');
      setLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      setError('로그인 상태를 확인할 수 없습니다.');
      setLoading(false);
      return;
    }

    let tag = generateRandomTag();
    let tries = 0;
    const maxTries = 5;

    while (tries < maxTries) {
      const { error } = await supabase.from('profiles').insert({
        id: userId,
        name,
        nickname,
        tag,
        bio,
      });

      if (!error) {
        router.push('/protected/dashboard');
        return;
      }

      if (error.code === '23505') {
        tag = generateRandomTag(); // 중복된 경우 재시도
        tries++;
      } else {
        setError('프로필 등록 중 오류가 발생했습니다.');
        setLoading(false);
        return;
      }
    }

    setError('중복 태그가 너무 많습니다. 닉네임을 바꿔보세요.');
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-sm mx-auto space-y-4">
        <h1 className="text-xl font-semibold text-center text-gray-900 dark:text-white">
          프로필 설정
        </h1>

        <input
          className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white"
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <textarea
          className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white"
          placeholder="자기소개 (선택)"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          className="w-full bg-black text-white p-2 rounded hover:bg-gray-800"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '등록 중...' : '프로필 등록하기'}
        </button>
      </div>
    </div>
  );
}
