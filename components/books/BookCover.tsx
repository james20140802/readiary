import Image from 'next/image';
import clsx from 'clsx';
import styles from './books.module.css';
import { spineColor } from './shelfStyle';

/**
 * 책 표지 한 장. 표지 사진이 없으면 제목으로 표지를 흉내 낸다(서가 책등과 같은 색).
 * 크기는 className(너비)으로 정하고 비율은 2:3으로 고정한다.
 */
export default function BookCover({
  title,
  coverUrl,
  className,
  shadow = 'md',
  sizes = '120px',
  alt = '',
  titleSize = 13,
  priority,
}: {
  title: string;
  coverUrl: string | null | undefined;
  className?: string;
  shadow?: 'sm' | 'md' | 'lg' | 'none';
  sizes?: string;
  alt?: string;
  titleSize?: number;
  priority?: boolean;
}) {
  const shadowClass =
    shadow === 'sm' ? styles.coverSm : shadow === 'lg' ? styles.coverLg : undefined;
  const base = clsx(styles.cover, shadow === 'none' && 'shadow-none', shadowClass, className);
  if (coverUrl) {
    return (
      <Image
        src={coverUrl}
        alt={alt}
        width={240}
        height={360}
        sizes={sizes}
        priority={priority}
        className={base}
      />
    );
  }
  const [bg, fg] = spineColor(title);
  return (
    <div
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={clsx(base, styles.coverPh)}
      style={{ background: bg, color: fg, fontSize: titleSize }}
    >
      {title}
    </div>
  );
}
