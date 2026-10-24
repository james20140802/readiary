import Link from 'next/link';

/** 견본 상태 고르기 — 화면 맨 아래 작은 줄. 실제 화면에는 없다 */
export default function LabStates({
  base,
  states,
  current,
}: {
  base: string;
  states: { key: string; label: string }[];
  current?: string;
}) {
  return (
    <nav
      aria-label="견본 상태"
      className="fixed bottom-[calc(var(--app-tabbar-h)+24px+var(--app-safe-bottom))] right-3 z-40 flex flex-wrap gap-1 rounded-lg bg-sheet/90 p-1 font-sans text-[12px] text-ink-sub shadow lg:bottom-4"
    >
      {states.map((s) => (
        <Link
          key={s.key}
          href={s.key ? `${base}?state=${s.key}` : base}
          aria-current={(current ?? '') === s.key ? 'page' : undefined}
          className="rounded px-1.5 py-0.5 aria-[current=page]:bg-ink aria-[current=page]:text-ink-invert"
        >
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
