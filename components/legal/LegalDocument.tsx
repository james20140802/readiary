import Link from 'next/link';
import Seal from '@/components/ui/Seal';
import { splitLegalBlocks } from '@/lib/legal/blocks';

interface LegalDocumentProps {
  /** 잉크색 작은 라벨 — "Terms of Service" */
  seal: string;
  title: string;
  /** "2026년 9월 13일 시행" 같은 한 줄 */
  effective: string;
  body: string;
  /** 문서 아래에서 오가는 다른 문서 */
  sibling: { href: string; label: string };
}

/**
 * 공개 법적 고지 한 장 — /terms, /privacy. 조문 제목은 산세리프 굵게, 본문은 줄바꿈을 그대로 살려
 * 목록 들여쓰기가 텍스트에 적힌 대로 보이게 한다. 동의 모달(ConsentFieldset)의 본문과 같은 문자열을
 * 같은 파서로 나눠 그린다.
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
    <article className="mx-auto max-w-2xl pb-8 pt-4 md:pt-8">
      <header className="border-b border-hairline pb-6">
        <Seal>{seal}</Seal>
        <h1 className="mt-1 font-serif text-page-title font-bold text-ink">{title}</h1>
        <p className="mt-2 text-caption text-ink-faint">{effective}</p>
      </header>

      <div className="mt-8 space-y-7">
        {blocks.map((block, i) => (
          <section key={i}>
            {block.heading && (
              <h2 className="mb-2 font-sans text-body font-bold text-ink">{block.heading}</h2>
            )}
            {block.body && (
              <p className="whitespace-pre-wrap text-body-sm leading-relaxed text-ink-sub">
                {block.body}
              </p>
            )}
          </section>
        ))}
      </div>

      <nav
        aria-label="다른 문서"
        className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5 text-body-sm"
      >
        <Link href="/" className="text-ink-sub underline-offset-4 hover:text-ink hover:underline">
          ← Readiary 홈
        </Link>
        <Link
          href={sibling.href}
          className="text-ink-sub underline-offset-4 hover:text-ink hover:underline"
        >
          {sibling.label} →
        </Link>
      </nav>
    </article>
  );
}
