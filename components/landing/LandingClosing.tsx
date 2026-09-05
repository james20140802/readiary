import Link from 'next/link';
import Button from '@/components/ui/Button';
import Seal from '@/components/ui/Seal';

/** ⑧ 시작 — 홈 맨 아래 장서표(Ex Libris) 명패의 이중 보더 어휘로 마지막 장을 닫는다 */
export default function LandingClosing() {
  return (
    <div className="flex flex-col items-center text-center">
      <section className="w-full max-w-md rounded-sm border border-hairline-strong bg-card p-[5px]">
        <div className="rounded-[2px] border border-hairline px-6 py-10">
          <Seal>Ex Libris</Seal>
          <p className="mt-1 font-serif text-[15px] font-bold text-ink">당신의 서재</p>
          <p className="mt-6 text-balance font-serif text-xl leading-relaxed text-ink md:text-2xl md:leading-relaxed">
            첫 문장을 옮겨 적는 순간부터
            <br />
            서재가 시작됩니다
          </p>
          <p className="mt-3 text-body-sm text-ink-sub">가입은 이메일 하나면 충분합니다.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Readiary 시작하기</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">로그인</Link>
            </Button>
          </div>
        </div>
      </section>
      <p className="mt-10 text-caption text-ink-faint">© 2026 Readiary</p>
    </div>
  );
}
