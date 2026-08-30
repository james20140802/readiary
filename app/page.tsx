// app/page.tsx

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Button from '@/components/ui/Button';
import Seal from '@/components/ui/Seal';

const FEATURES = [
  {
    label: '문장',
    heading: '옮겨 적는 것으로 충분해요',
    body: '길게 쓰지 않아도 됩니다. 오늘 마음에 남은 문장 하나를 옮겨 적는 것이 기록의 시작이에요. 생각이 이어지면 그때 덧붙이면 됩니다.',
  },
  {
    label: '회고',
    heading: '지난 문장이 돌아옵니다',
    body: '지난날 적어 둔 문장이 회상 카드로 돌아오고, 완독한 책은 한 권의 발췌집이 됩니다. 매월 첫날엔 지난달의 기록을 돌아봐요.',
  },
  {
    label: '함께',
    heading: '친구의 문장에 마음을 남겨요',
    body: '친구가 옮겨 적은 문장을 피드에서 만나고, 좋아요와 댓글로 마음을 보태세요. 아끼는 문장은 카드로 만들어 공유할 수 있어요.',
  },
];

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/protected/dashboard');
  }

  return (
    <div className="flex flex-col gap-16 py-8 md:gap-24 md:py-14">
      <section className="flex flex-col items-center pt-10 text-center md:pt-16">
        <span aria-hidden className="font-serif text-4xl text-ink-faint">
          讀
        </span>
        <h1 className="mt-6 font-serif text-3xl font-bold leading-snug text-ink md:text-4xl">
          하루 한 문장이면
          <br />
          충분한 독서 기록
        </h1>
        <p className="mt-5 text-body leading-relaxed text-ink-sub">
          오늘 마음에 남은 문장 하나를 옮겨 적으세요.
          <br />
          문장이 쌓여 책장이 되고, 회고가 됩니다.
        </p>
        <div className="mt-9 flex gap-3">
          <Button asChild size="lg">
            <Link href="/signup">시작하기</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/login">로그인</Link>
          </Button>
        </div>
      </section>

      <section aria-label="기록 예시">
        <figure className="rounded-md border border-hairline bg-card px-6 py-8 md:px-10 md:py-10">
          <blockquote className="font-serif text-quote text-ink">
            “책은 우리 안의 얼어붙은 바다를 깨는 도끼여야 한다.”
          </blockquote>
          <figcaption className="mt-5 flex items-baseline justify-between gap-4">
            <span className="text-caption text-ink-sub">프란츠 카프카, 1904년의 편지에서</span>
            <Seal>오늘의 문장</Seal>
          </figcaption>
        </figure>
      </section>

      <section className="flex flex-col gap-4 md:flex-row">
        {FEATURES.map((feature) => (
          <article
            key={feature.label}
            className="flex-1 rounded-md border border-hairline bg-card p-6"
          >
            <p className="text-overline text-accent">{feature.label}</p>
            <h2 className="mt-3 font-serif text-section-title text-ink">{feature.heading}</h2>
            <p className="mt-3 text-body-sm leading-relaxed text-ink-sub">{feature.body}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-col items-center border-t border-hairline pt-12 text-center md:pt-16">
        <p className="font-serif text-section-title text-ink">오늘의 문장부터 시작해 보세요</p>
        <p className="mt-3 text-body-sm text-ink-sub">가입은 이메일 하나면 충분합니다.</p>
        <div className="mt-7">
          <Button asChild size="lg">
            <Link href="/signup">Readiary 시작하기</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
