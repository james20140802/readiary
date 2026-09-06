import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/legal/contact';

/**
 * 랜딩 마지막 장 아래의 푸터 — 약관·개인정보처리방침·문의 링크와 저작권 표시.
 * 랜딩은 화면 높이의 장을 겹쳐 넘기는 스택이라 페이지 끝에 따로 푸터를 둘 자리가 없어,
 * 마지막 장(LandingClosing) 안에 헤어라인 한 줄로 앉힌다. Google OAuth 브랜딩은 홈페이지에서
 * 개인정보처리방침으로 가는 링크를 요구한다.
 */
export default function LandingFooter() {
  const linkClass = 'underline-offset-4 hover:text-ink hover:underline';
  return (
    <footer className="mt-12 w-full max-w-md border-t border-hairline pt-4 text-caption text-ink-faint">
      <nav aria-label="서비스 안내" className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link href="/terms" className={linkClass}>
          이용 약관
        </Link>
        <Link href="/privacy" className={linkClass}>
          개인정보처리방침
        </Link>
        {SUPPORT_EMAIL && (
          <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
            문의
          </a>
        )}
      </nav>
      <p className="mt-3 text-center">© 2026 Readiary</p>
    </footer>
  );
}
