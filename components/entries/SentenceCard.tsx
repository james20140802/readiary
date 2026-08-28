export interface SentenceCardProps {
  quote: string | null;
  note: string | null;
  bookTitle: string;
  bookAuthor?: string | null;
  dateLabel: string;
  nickname?: string;
  collapsed?: boolean;
  showWordmark?: boolean;
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
        <div className="min-w-0">
          <p className="text-body-sm font-semibold text-ink truncate">『{bookTitle}』</p>
          {attribution && (
            <p className="text-caption text-ink-faint truncate">{attribution}</p>
          )}
        </div>
        {showWordmark && (
          <span className="text-seal text-ink-faint shrink-0">READIARY</span>
        )}
      </figcaption>
    </figure>
  );
}
