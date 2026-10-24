/**
 * 기록 쓰기 칸의 공용 모양 — 시안 .longf: 이름표는 작은 산세리프, 칸은 밑줄 없이
 * 왼쪽의 짧은 선(헤어라인)이 포커스에 강조색이 된다. 잘못 쓰면 그 선이 위험색이 된다.
 */
export const FIELD_LABEL = 'block font-sans text-[14px] font-semibold text-ink-sub';

export const LONG_FIELD =
  'mt-1.5 block w-full resize-none bg-transparent py-0.5 pl-3.5 font-serif text-note text-ink outline-none transition-shadow duration-150 shadow-[inset_2px_0_0_rgb(var(--hairline))] placeholder:text-ink-faint focus:shadow-[inset_2px_0_0_rgb(var(--accent))] aria-[invalid=true]:shadow-[inset_2px_0_0_rgb(var(--danger))] disabled:opacity-60';

/** 쪽·날짜 같은 짧은 칸 — 1px 밑줄이 포커스에 강조색이 된다(시안 .pg input) */
export const SHORT_FIELD =
  'h-11 border-0 border-b border-hairline bg-transparent text-center font-mono text-[17px] font-medium text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent disabled:opacity-60';
