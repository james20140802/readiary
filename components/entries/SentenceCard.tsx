import Image from 'next/image';

export interface SentenceCardProps {
  quote: string | null;
  note: string | null;
  bookTitle: string;
  bookAuthor?: string | null;
  dateLabel: string;
  nickname?: string;
  collapsed?: boolean;
  showWordmark?: boolean;
  /** 전달하면 출처 줄 왼쪽에 표지 썸네일(가름끈 포함)을 보여준다. null이면 기본 표지 */
  coverUrl?: string | null;
  className?: string;
}

export default function SentenceCard({
  quote,
  note,
  bookTitle,
  bookAuthor,
  dateLabel,
  nickname,
  collapsed = false,
  showWordmark = false,
  coverUrl,
  className = '',
}: SentenceCardProps) {
  const attribution = [bookAuthor, dateLabel, nickname ? `@${nickname}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <figure className={className}>
      {quote && (
        <blockquote
          className={`font-serif text-quote text-ink whitespace-pre-wrap ${
            collapsed ? 'line-clamp-4' : ''
          }`}
        >
          “{quote}”
        </blockquote>
      )}
      {note && (
        <p
          className={`text-body-sm text-ink-sub whitespace-pre-wrap ${
            quote ? 'mt-3' : ''
          } ${collapsed ? 'line-clamp-3' : ''}`}
        >
          {note}
        </p>
      )}
      <figcaption className="mt-4 flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {coverUrl !== undefined && (
            <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-[3px] border border-hairline">
              <Image
                src={coverUrl ?? '/images/default-book-cover.png'}
                alt={`『${bookTitle}』 표지`}
                fill
                className="object-cover"
                sizes="40px"
              />
              {/* 가름끈 — 표지에 끼워 둔 책갈피 리본 */}
              <span
                aria-hidden
                className="absolute -top-px right-1.5 h-[15px] w-[5px] bg-accent/90"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 70%, 0 100%)' }}
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-ink truncate">『{bookTitle}』</p>
            {attribution && <p className="text-caption text-ink-faint truncate">{attribution}</p>}
          </div>
        </div>
        {showWordmark && <span className="text-seal text-ink-faint shrink-0">READIARY</span>}
      </figcaption>
    </figure>
  );
}
