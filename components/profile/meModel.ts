import { formatInTimeZone } from 'date-fns-tz';

const KST = 'Asia/Seoul';

/** '2026년 3월 8일' (KST) — 판권의 처음 펴낸 날 */
export function formatPublishedDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return formatInTimeZone(d, KST, 'yyyy년 M월 d일');
}
