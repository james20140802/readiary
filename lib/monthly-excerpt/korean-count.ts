const UNITS = ['한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'];
const TENS = ['열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];

/** 6 → '여섯', 20 → '스무' — 판권장 문구용 우리말 셈. 100부터는 숫자 그대로. */
export function koreanCount(n: number): string {
  if (n < 1 || n >= 100) return String(n);
  if (n === 20) return '스무';
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  return `${tens > 0 ? TENS[tens - 1] : ''}${unit > 0 ? UNITS[unit - 1] : ''}`;
}

/** '네 권의 책에서 문장 서른여덟 개를 남겼어요.' */
export function promptSummary(bookCount: number, quoteCount: number): string {
  // 우리말 셈은 99까지 — 그 너머는 숫자라 단위를 붙여 쓴다
  const counted = (n: number, unit: string) =>
    n >= 1 && n < 100 ? `${koreanCount(n)} ${unit}` : `${n}${unit}`;
  return `${counted(bookCount, '권')}의 책에서 문장 ${counted(quoteCount, '개')}를 남겼어요.`;
}
