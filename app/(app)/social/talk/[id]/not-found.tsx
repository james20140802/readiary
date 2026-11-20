import Link from 'next/link';

export default function DebateNotFound() {
  return (
    <div className="mx-auto max-w-[640px] py-16 text-center">
      <p className="font-serif text-note text-ink">찾을 수 없는 토론이에요.</p>
      <p className="mt-2 font-sans text-caption text-ink-sub">
        지워졌거나, 발제한 사람과 친구가 아니면 볼 수 없어요.
      </p>
      <Link
        href="/social/talk"
        className="mt-6 inline-block font-sans text-caption font-semibold text-accent"
      >
        토론 목록으로
      </Link>
    </div>
  );
}
