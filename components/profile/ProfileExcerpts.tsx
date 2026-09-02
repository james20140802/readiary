import Link from 'next/link';
import type { FinishedBookExcerpt } from '@/lib/profile/fetchRetrospectData';

interface Props {
  /** 책갈피로 꽂은 것을 뺀 나머지 발췌집 */
  books: FinishedBookExcerpt[];
  /** 발췌집 링크 — 본인은 발췌집 페이지, 친구는 그 책 페이지 */
  hrefFor: (bookId: string) => string;
}

/**
 * 발췌집 — 책장 아래에 놓인 공책 여러 권. 완독한 책마다 한 권씩, 왼쪽에 제본선이 있는 얇은 노트.
 * 책갈피로 꽂아 둔 한 권은 프로필 책 안에 있으니 여기서는 뺀다.
 */
export default function ProfileExcerpts({ books, hrefFor }: Props) {
  if (books.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-5 font-serif text-[17px] font-bold text-ink">
        발췌집
        <span className="ml-2 font-sans text-[12.5px] font-normal tabular-nums text-ink-faint">
          {books.length}권
        </span>
      </h2>
      <ul className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 pt-1">
        {books.map((book) => (
          <li key={book.bookId} className="shrink-0">
            <Link
              href={hrefFor(book.bookId)}
              className="group relative flex h-[128px] w-[96px] flex-col justify-between rounded-r-[5px] border border-hairline-strong bg-card py-3 pl-5 pr-3 transition-transform duration-200 hover:-translate-y-1"
            >
              {/* 제본선 — 왼쪽에 두 줄, 실로 꿰맨 자리 */}
              <span aria-hidden className="absolute inset-y-0 left-2 w-px bg-hairline-strong" />
              <span aria-hidden className="absolute inset-y-0 left-[11px] w-px bg-hairline" />
              <span className="line-clamp-3 break-keep font-serif text-[12.5px] leading-snug text-ink group-hover:text-accent">
                {book.title}
              </span>
              <span className="font-sans text-[11px] tabular-nums text-ink-faint">
                문장 {book.quoteCount}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
