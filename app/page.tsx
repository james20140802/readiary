// app/page.tsx

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/protected/dashboard');
  }

  return (
    <main className="min-h-screen text-foreground">
      <section className="min-h-screen flex flex-col justify-center items-center px-6 py-24 text-center">
        <div className="max-w-xl">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6">
            📚 Readiary에 오신 것을 환영합니다!
          </h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            매일의 독서 기록을 손쉽게 남기고, 나만의 책장을 채워보세요. <br />
            회원 가입 후 바로 시작할 수 있어요.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/login">
              <button className="px-6 py-3 rounded-md bg-primary hover:bg-primary/90 text-base font-medium text-black dark:text-white">
                로그인
              </button>
            </Link>
            <Link href="/signup">
              <button className="px-6 py-3 rounded-md border border-input hover:bg-accent hover:text-accent-foreground text-base font-medium">
                회원가입
              </button>
            </Link>
          </div>
        </div>
      </section>

      <section className="min-h-screen py-24 px-6 text-center bg-muted/20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">📖 매일 기록하세요</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            오늘 읽은 페이지를 간단히 요약하고, <br /> 내가 읽은 흔적을 기록해보세요.
          </p>
        </div>
      </section>

      <section className="min-h-screen py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">📚 나만의 책장을 채워보세요</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            내가 읽은 책들을 커버 이미지와 함께 시각적으로 모아보세요.
          </p>
        </div>
      </section>

      <section className="min-h-screen py-24 px-6 text-center bg-muted/20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">🎯 독서 목표와 통계를 확인하세요</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            총 읽은 책 수, 작성한 기록, 읽은 페이지 수를 한눈에!
            <br />
            스스로의 성장을 데이터로 확인해보세요.
          </p>
        </div>
      </section>

      <section className="min-h-screen py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">🏅 업적과 뱃지를 모아보세요</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            꾸준히 기록하면 다양한 업적을 달성할 수 있어요. <br />
            성취감을 느껴보세요!
          </p>
        </div>
      </section>

      <section className="min-h-screen py-24 px-6 text-center bg-muted/20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">👥 친구들과 책을 공유하세요</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            친구의 독서 현황을 확인하고, <br />
            어떤 책을 읽고 있는지 함께 나눠보세요.
          </p>
        </div>
      </section>
    </main>
  );
}
