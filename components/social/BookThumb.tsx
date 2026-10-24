import Image from 'next/image';
import clsx from 'clsx';

interface BookThumbProps {
  url?: string | null;
  title: string;
  /** 표지 폭(px). 높이는 7:10 */
  width: number;
  className?: string;
}

/**
 * 작은 책 표지. 책은 종이 위에 놓인 물건이라 시안처럼 아래로 얕은 그림자를 둔다(카드 그림자와 다르다).
 * 표지가 없으면 헤어라인 색 판에 제목 첫 글자를 둔다.
 */
export default function BookThumb({ url, title, width, className }: BookThumbProps) {
  const height = Math.round((width * 10) / 7);
  return (
    <span
      className={clsx(
        'relative block shrink-0 overflow-hidden rounded-[2px] bg-hairline shadow-[0_8px_14px_-8px_rgb(0_0_0/.5)]',
        className
      )}
      style={{ width, height }}
    >
      {url ? (
        <Image src={url} alt="" fill sizes={`${width}px`} className="object-cover" />
      ) : (
        <span
          aria-hidden
          className="grid h-full place-items-center font-serif text-[13px] font-semibold text-ink-sub"
        >
          {title.trim().charAt(0)}
        </span>
      )}
    </span>
  );
}
