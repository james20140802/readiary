import Link from 'next/link';
import clsx from 'clsx';

/** 소셜 맨 위의 전환 — 친구의 문장 | 토론. 주소로 오가므로 각 화면이 서버에서 그려진다 */
export default function SocialSegment({ active }: { active: 'feed' | 'talk' }) {
  const tabs = [
    { key: 'feed', href: '/social', label: '친구의 문장' },
    { key: 'talk', href: '/social/talk', label: '토론' },
  ] as const;
  return (
    <nav
      aria-label="소셜"
      className="grid h-11 grid-cols-2 rounded-full bg-ink/[0.07] p-0.5 lg:h-10 lg:w-[280px]"
    >
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? 'page' : undefined}
          className={clsx(
            'flex items-center justify-center rounded-full font-sans text-button-sm transition-colors duration-150',
            active === t.key
              ? 'bg-paper text-ink shadow-[0_0_0_1px_rgb(var(--hairline-strong))]'
              : 'text-ink-sub hover:text-ink'
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
