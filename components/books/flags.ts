/**
 * 책 플래그 — 설계 4.1. 쪽 번호가 있는 기록마다 표지 오른쪽 옆면에서 플래그 하나가 나온다.
 * 위치·색·몰린 플래그의 길이 단계와 누름 영역을 계산하는 순수 함수만 둔다(화면 부품은 BookFlags).
 * 값은 시안 docs/design/concept-2026-10/book-layer.html의 플래그 스크립트 그대로다.
 */
import { formatInTimeZone } from 'date-fns-tz';

/** 플래그 색 여섯 — tailwind `flag-*` 토큰 이름과 같다. 기록한 날짜 순서대로 돌려 쓴다 */
export const FLAG_COLORS = ['yellow', 'pink', 'orange', 'green', 'blue', 'purple'] as const;
export type FlagColor = (typeof FLAG_COLORS)[number];

/** 앱이 쓰는 사용자 시간대(lib/dates의 todayKST와 같은 기준) */
export const DEFAULT_TIME_ZONE = 'Asia/Seoul';

/** 표지 위·아래 끝에서 플래그를 띄우는 거리(px) — 시안 `14+(pg/T)*(H-28)` */
export const FLAG_EDGE = 14;
/** 이보다 가까이 붙은 플래그는 나온 길이를 한 단씩 달리한다(px) */
export const FLAG_CROWD = 11;
/** 단계 수 — 짧은 것, 중간, 긴 것 */
export const FLAG_TIERS = 3;
/** 가장 짧은 플래그가 옆면 밖으로 나온 길이와 단계마다 늘어나는 길이(px) */
export const FLAG_LEN = 14;
export const FLAG_LEN_STEP = 9;
/** 표지 뒤 쪽 사이로 들어가 보이지 않는 밑동 길이(px) */
export const FLAG_HIDDEN = 18;
/** 플래그 두께(px) */
export const FLAG_THICKNESS = 10;
/** 누름 영역이 플래그 위아래로 더 나오는 만큼 — 시안 `.flag::after{top:-2px;bottom:-2px}` */
export const FLAG_HIT_HALF = FLAG_THICKNESS / 2 + 2;
/** 누름 영역의 최소 높이(px) — 몰려도 플래그마다 눌릴 자리가 남는다 */
export const FLAG_HIT_MIN = 0.25;

export interface FlagSource {
  id: string;
  /** 기록의 날짜 'YYYY-MM-DD'(사용자가 고른 읽은 날, 이미 사용자 달력의 날짜) */
  date: string | null;
  /** date가 없을 때만 쓴다 — 시각을 사용자 시간대의 날짜로 바꾼다 */
  createdAt?: string | null;
  fromPage: number | null;
  toPage: number | null;
}

export interface BookFlag<T extends FlagSource = FlagSource> {
  id: string;
  page: number;
  /** 0(첫 쪽) ~ 1(마지막 쪽) */
  ratio: number;
  /** 'YYYY-MM-DD' */
  day: string;
  color: FlagColor;
  source: T;
}

function validPage(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/** 플래그를 꽂을 쪽 — 시작 쪽, 없으면 끝 쪽. 쪽 번호가 없으면 null(플래그 없음) */
export function flagPage(e: Pick<FlagSource, 'fromPage' | 'toPage'>): number | null {
  if (validPage(e.fromPage)) return e.fromPage;
  if (validPage(e.toPage)) return e.toPage;
  return null;
}

/** 마지막 쪽 — 전체 쪽수, 없으면 그 책에서 기록한 가장 큰 쪽 */
export function flagEnd(
  totalPages: number | null | undefined,
  entries: Pick<FlagSource, 'fromPage' | 'toPage'>[]
): number | null {
  if (validPage(totalPages)) return totalPages;
  let max = 0;
  for (const e of entries) {
    if (validPage(e.fromPage)) max = Math.max(max, e.fromPage);
    if (validPage(e.toPage)) max = Math.max(max, e.toPage);
  }
  return max > 0 ? max : null;
}

/** 기록한 날 — 사용자 시간대의 'YYYY-MM-DD' */
export function flagDay(
  e: Pick<FlagSource, 'date' | 'createdAt'>,
  timeZone: string = DEFAULT_TIME_ZONE
): string | null {
  const d = e.date?.slice(0, 10);
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  if (e.createdAt) {
    const t = new Date(e.createdAt);
    if (!Number.isNaN(t.getTime())) return formatInTimeZone(t, timeZone, 'yyyy-MM-dd');
  }
  return null;
}

/** 날짜 → 색. 이른 날부터 여섯 색을 차례로 돌려 쓴다. 같은 날은 같은 색 */
export function colorsByDay(days: string[]): Map<string, FlagColor> {
  const sorted = [...new Set(days)].sort();
  return new Map(sorted.map((d, i) => [d, FLAG_COLORS[i % FLAG_COLORS.length]]));
}

/**
 * 기록 목록 → 플래그. 쪽 번호가 없는 기록은 빠진다. 앞쪽(작은 쪽)부터, 같은 쪽은 이른 날부터.
 * 색은 플래그가 있는 기록뿐 아니라 그 책의 모든 기록 날짜로 돌린다 — 쪽 없는 기록을 남긴 날도 한 묶음이다.
 */
export function buildFlags<T extends FlagSource>(
  entries: T[],
  totalPages: number | null | undefined,
  timeZone: string = DEFAULT_TIME_ZONE
): BookFlag<T>[] {
  const end = flagEnd(totalPages, entries);
  if (end == null) return [];
  const days = entries.map((e) => flagDay(e, timeZone)).filter((d): d is string => d != null);
  const palette = colorsByDay(days);
  const flags: BookFlag<T>[] = [];
  for (const e of entries) {
    const page = flagPage(e);
    const day = flagDay(e, timeZone);
    if (page == null || day == null) continue;
    flags.push({
      id: e.id,
      page,
      ratio: Math.min(1, Math.max(0, page / end)),
      day,
      color: palette.get(day) ?? FLAG_COLORS[0],
      source: e,
    });
  }
  return flags.sort(
    (a, b) =>
      a.page - b.page ||
      a.day.localeCompare(b.day) ||
      (a.source.createdAt ?? '').localeCompare(b.source.createdAt ?? '') ||
      a.id.localeCompare(b.id)
  );
}

export interface FlagRect {
  /** 옆면(표지 오른쪽 끝)에서 잰 가로 범위(px) */
  x0: number;
  x1: number;
  /** 표지 위에서 잰 세로 범위(px) */
  y0: number;
  y1: number;
}

export interface FlagLayout {
  id: string;
  /** 플래그 가운데의 세로 자리(px) */
  y: number;
  tier: number;
  /** 옆면 밖으로 나온 길이(px) */
  len: number;
  /** 짧은 것이 앞에 */
  z: number;
  /** 누름 영역 — 나온 부분 안에서만, 옆 플래그와 겹치지 않는다 */
  hit: FlagRect;
}

/**
 * 표지 높이에 맞춰 플래그를 세운다. 입력은 앞쪽부터(buildFlags 순서).
 * 가까이 붙은 플래그는 실제 플래그 묶음처럼 나온 길이를 한 단씩 달리한다 — 짧은 것이 앞에, 긴 것은 뒤에서 끝만.
 *
 * 누름 영역: 가까운(누름 높이가 겹칠 수 있는) 이웃 중 더 짧은 것이 있으면 그 끝부터 시작한다 —
 * 긴 플래그는 짧은 플래그 너머로 나온 끝만 눌린다. 길이가 같은 이웃과는 세로를 반으로 나눈다.
 */
export function layoutFlags(flags: { id: string; ratio: number }[], height: number): FlagLayout[] {
  if (!(height > 0)) return [];
  const span = Math.max(0, height - FLAG_EDGE * 2);
  const placed: { id: string; y: number; tier: number; len: number }[] = [];
  let prev: { y: number; tier: number } | null = null;
  for (const f of flags) {
    const y = FLAG_EDGE + f.ratio * span;
    const tier: number = prev && y - prev.y < FLAG_CROWD ? (prev.tier + 1) % FLAG_TIERS : 0;
    placed.push({ id: f.id, y, tier, len: FLAG_LEN + tier * FLAG_LEN_STEP });
    prev = { y, tier };
  }

  const reach = FLAG_HIT_HALF * 2;
  return placed.map((p, i) => {
    let x0 = 0;
    // 같은 자리·같은 길이로 겹친 플래그(같은 쪽 기록)는 누름 영역을 위아래로 균등하게 나눈다 — 높이가 0이 되지 않게
    let group = 0;
    let rank = 0;
    let above = -Infinity;
    let below = Infinity;
    placed.forEach((q, j) => {
      if (i === j) return;
      const d = Math.abs(p.y - q.y);
      if (d >= reach) return;
      if (q.len < p.len) x0 = Math.max(x0, q.len);
      else if (q.len === p.len) {
        if (d < 1e-6) {
          group += 1;
          if (j < i) rank += 1;
        } else if (q.y < p.y) above = Math.max(above, p.y - d / 2);
        else below = Math.min(below, p.y + d / 2);
      }
    });
    const n = group + 1;
    const slice = (FLAG_HIT_HALF * 2) / n;
    let y0 = p.y - FLAG_HIT_HALF + slice * rank;
    let y1 = y0 + slice;
    // 맞붙은 이웃과는 가운데에서 나누되, 영역이 사라질 만큼 줄이지는 않는다
    if (rank === 0) y0 = Math.max(y0, above);
    if (rank === n - 1) y1 = Math.min(y1, below);
    if (y1 - y0 < FLAG_HIT_MIN) {
      // 영역이 사라지지 않게, 바깥으로 막히지 않은 쪽으로 최소 높이만큼 되살린다
      if (rank === n - 1 && y1 === below) y0 = y1 - FLAG_HIT_MIN;
      else y1 = y0 + FLAG_HIT_MIN;
    }
    return {
      id: p.id,
      y: p.y,
      tier: p.tier,
      len: p.len,
      z: FLAG_TIERS - p.tier,
      hit: { x0, x1: p.len, y0, y1 },
    };
  });
}

/** 두 누름 영역이 겹치는지(경계가 맞닿는 것은 겹침이 아니다) */
export function rectsOverlap(a: FlagRect, b: FlagRect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}
