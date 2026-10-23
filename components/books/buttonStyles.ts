/**
 * 시안 app.css `.btn.ink`·`.btn.line`·`.btn.sm` — 책 화면의 알약 버튼.
 * 공용 Button과 높이·글자는 같고(48px·17px), 보조 버튼의 외곽선을 시안처럼 inset 헤어라인으로 긋는다.
 */
const BASE =
  'inline-flex h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-[22px] font-sans text-[17px] font-semibold transition-transform duration-150 ease-ink-out active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50';

export const BTN_INK = `${BASE} bg-ink text-paper`;
export const BTN_LINE = `${BASE} text-ink shadow-[inset_0_0_0_1px_rgb(var(--hairline))]`;
export const BTN_DANGER = `${BASE} bg-danger text-paper`;
export const BTN_SM = '!h-10 !px-4 !text-[15px]';
