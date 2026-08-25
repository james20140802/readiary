import { formatInTimeZone } from 'date-fns-tz';

const KST = 'Asia/Seoul';

export function toKSTDateString(d: Date): string {
  return formatInTimeZone(d, KST, 'yyyy-MM-dd');
}

export function todayKST(): string {
  return toKSTDateString(new Date());
}
