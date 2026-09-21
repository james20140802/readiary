'use client';

/** A completed mutation must never be repeated just because navigation is slow. */
export default function ActionNavigation({ href }: { href?: string | null }) {
  if (!href) return null;
  return (
    <p role="status" className="mt-3 text-caption text-ink-sub">
      완료했어요. 화면을 이동하는 중입니다.{' '}
      <a href={href} className="underline">
        이동이 늦으면 여기를 눌러 주세요
      </a>
    </p>
  );
}
