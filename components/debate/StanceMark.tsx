import { ArrowLeftRight, Check, CircleHelp, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { STANCE_LABEL, type Stance } from '@/lib/debate/types';

export const STANCE_ICON: Record<Stance, LucideIcon> = {
  agree: Check,
  differ: ArrowLeftRight,
  question: CircleHelp,
};

/** 답의 입장 — 아이콘 + 글자. "다르게 읽음"만 파란 잉크로 아낀다 */
export default function StanceMark({ stance, className }: { stance: Stance; className?: string }) {
  const Icon = STANCE_ICON[stance];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-sans text-fine font-semibold',
        stance === 'differ' ? 'text-accent' : 'text-ink-sub',
        className
      )}
    >
      <Icon size={13} strokeWidth={1.75} aria-hidden />
      {STANCE_LABEL[stance]}
    </span>
  );
}
