import Link from 'next/link';
import { splitLegalBlocks } from '@/lib/legal/blocks';
import PublicHeader from '@/components/tools/PublicHeader';

interface LegalDocumentProps {
  /** 제목 위 작은 라벨 — "Terms of Service" */
  seal: string;
  title: string;
  /** "2026년 9월 13일 시행" 같은 한 줄 */
  effective: string;
  body: string;
  /** 문서 아래에서 오가는 다른 문서 */
  sibling: { href: string; label: string };
}

/**
 * 공개 법적 고지 한 장 — /terms, /privacy. 메뉴 없는 괘선 종이 위 도구 화면 문법:
 * 위에 'Readiary'와 로그인·시작하기, 산세리프 큰 제목, 헤어라인으로 나눈 조문.
 * 본문은 줄바꿈을 그대로 살려 목록 들여쓰기가 텍스트에 적힌 대로 보이게 한다.
 */
export default function LegalDocument({
  seal,
  title,
  effective,
  body,
  sibling,
}: LegalDocumentProps) {
  const blocks = splitLegalBlocks(body);
  return (
    <div className="mx-auto max-w-[1000px]">
      <PublicHeader />
      <article className="mx-auto max-w-[720px] pb-8 pt-6 lg:pt-10">
        <header className="border-b border-hairline pb-6">
          <p className="font-sans text-overline text-ink-sub">{seal}</p>
          <h1 className="mt-1 font-sans text-page-title text-ink lg:text-page-title-lg">{title}</h1>
          <p className="mt-2 font-sans text-caption text-ink-sub">{effective}</p>
        </header>

        <div className="mt-8 space-y-7">
          {blocks.map((block, i) => (
            <section key={i}>
              {block.heading && (
                <h2 className="mb-2 font-sans text-body font-bold text-ink">{block.heading}</h2>
              )}
              {block.body && (
                <p className="whitespace-pre-wrap font-sans text-body text-ink-sub">{block.body}</p>
              )}
            </section>
          ))}
        </div>

        <nav
          aria-label="다른 문서"
          className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4 font-sans text-caption text-ink-sub"
        >
          <Link
            href="/"
            prefetch={false}
            className="inline-flex min-h-11 items-center rounded-sm hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Readiary 처음으로
          </Link>
          <Link
            href={sibling.href}
            prefetch={false}
            className="inline-flex min-h-11 items-center rounded-sm hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {sibling.label}
          </Link>
        </nav>
      </article>
    </div>
  );
}
