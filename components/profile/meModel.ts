import { formatInTimeZone } from 'date-fns-tz';

const KST = 'Asia/Seoul';

const COUNT_WORDS = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
const VOLUME_WORDS = [
  '첫째',
  '둘째',
  '셋째',
  '넷째',
  '다섯째',
  '여섯째',
  '일곱째',
  '여덟째',
  '아홉째',
  '열째',
];

/** 1 → '첫 번째', 3 → '세 번째'. 열을 넘으면 숫자로 */
export function ordinalCount(n: number): string {
  return n >= 1 && n <= COUNT_WORDS.length ? `${COUNT_WORDS[n - 1]} 번째` : `${n}번째`;
}

/** 1 → '첫째 권', 3 → '셋째 권'. 열을 넘으면 숫자로 */
export function ordinalVolume(n: number): string {
  return n >= 1 && n <= VOLUME_WORDS.length ? `${VOLUME_WORDS[n - 1]} 권` : `${n}번째 권`;
}

function kstYear(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Number(formatInTimeZone(d, KST, 'yyyy'));
}

/** 그려 두는 일기장 권수 — 뒤의 권은 기울어져 쌓인다 */
export const DIARY_DRAWN = 3;

export interface DiaryShelf {
  /** 지금 쓰는 일기장이 몇 번째 권인지 — 가입한 해부터 해마다 한 권 */
  count: number;
  firstYear: number;
  /** 그릴 권의 해 — 맨 앞이 올해, 최대 DIARY_DRAWN권 */
  years: number[];
}

/** 가입한 해(KST)부터 올해까지 해마다 한 권씩 — 기록 데이터 없이 가입일만으로 센다 */
export function diaryShelf(createdAt: string | null | undefined, todayKst: string): DiaryShelf {
  const thisYear = Number(todayKst.slice(0, 4));
  const firstYear = Math.min(kstYear(createdAt) ?? thisYear, thisYear);
  const count = thisYear - firstYear + 1;
  const years = Array.from({ length: Math.min(count, DIARY_DRAWN) }, (_, i) => thisYear - i);
  return { count, firstYear, years };
}

/** '2026년 3월 8일' (KST) — 판권의 처음 펴낸 날 */
export function formatPublishedDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return formatInTimeZone(d, KST, 'yyyy년 M월 d일');
}
