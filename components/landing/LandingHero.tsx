import Link from 'next/link';
import Button from '@/components/ui/Button';

/** ① 표지 — 讀 한 글자와 표제, 그리고 아래로 넘기라는 작은 신호 */
export default function LandingHero() {
  return (
    <div className="flex flex-col items-center text-center">
      <span aria-hidden className="font-serif text-5xl text-ink-faint md:text-6xl">
        讀
      </span>
      <h1 className="mt-7 text-balance font-serif text-[2rem] font-bold leading-snug text-ink md:text-5xl md:leading-tight">
        하루 한 문장이면
        <br />
        충분한 독서 기록
      </h1>
      <p className="mt-6 text-body leading-relaxed text-ink-sub md:text-lg md:leading-relaxed">
        오늘 마음에 남은 문장 하나를 옮겨 적으세요.
        <br />
        문장이 쌓여 책장이 되고, 회고가 됩니다.
      </p>
      <div className="mt-10 flex gap-3">
        <Button asChild size="lg">
          <Link href="/signup">시작하기</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/login">로그인</Link>
        </Button>
      </div>

      {/* 넘김 신호 — 잉크 한 방울이 실처럼 흘러내린다 */}
      <div className="mt-16 flex flex-col items-center gap-3 text-caption text-ink-faint md:mt-20">
        <span>아래로 넘겨 보세요</span>
        <span aria-hidden className="block h-9 w-px overflow-hidden bg-hairline">
          <span className="block h-full w-full bg-accent animate-[landing-drip_2s_ease-in-out_infinite] motion-reduce:animate-none" />
        </span>
      </div>
    </div>
  );
}
