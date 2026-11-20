import type { PhotoWord, Size, View } from './types';

/** 사진을 줄일 때의 긴 변(px) */
export const MAX_EDGE = 2000;
export const MAX_ZOOM = 6;
/** 손가락으로 이만큼 누르고 있으면 고르기가 시작된다(ms) */
export const HOLD_MS = 320;
/** 누른 뒤 이만큼 넘게 움직이면 고르기가 아니라 옮기기다(px) */
export const SLOP = 10;
/** 두 번 두드렸을 때의 배율 */
export const DOUBLE_ZOOM = 2.5;
/** 돋보기가 지금 크기보다 얼마나 크게 보여 주는지 */
export const LOUPE_SCALE = 1.6;

export function orderRange(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}

/** 고른 구간의 낱말을 띄어쓰기 정보로 잇는다. 구간이 뒤집혀 있어도 되고, 마지막 낱말 뒤는 버린다 */
export function rangeText(words: PhotoWord[], from: number, to: number): string {
  const [start, end] = orderRange(from, to);
  let text = '';
  for (let i = Math.max(0, start); i <= Math.min(words.length - 1, end); i++) {
    text += words[i].text + words[i].sep;
  }
  return text.trim();
}

export function allText(words: PhotoWord[]): string {
  return rangeText(words, 0, words.length - 1);
}

/**
 * 사진 좌표의 점에 있는 낱말. 낱말 위가 아니면 가장 가까운 낱말을 잡되,
 * 세로 거리를 네 배로 쳐서 위아래 줄보다 같은 줄을 먼저 잡는다. 낱말이 없으면 -1
 */
export function wordAt(words: PhotoWord[], x: number, y: number): number {
  let best = -1;
  let bestDistance = Infinity;
  words.forEach((word, i) => {
    const [x0, y0, x1, y1] = word.box;
    const dx = Math.max(x0 - x, 0, x - x1);
    const dy = Math.max(y0 - y, 0, y - y1);
    const distance = dx * dx + dy * dy * 4;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  });
  return best;
}

/** 낱말 상자 안의 점인지 — 마우스는 낱말 위에서 눌러야 고르기가 시작된다 */
export function insideWord(word: PhotoWord, x: number, y: number): boolean {
  const [x0, y0, x1, y1] = word.box;
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

/** 문장 칸에 넣기 — 쓰던 글을 덮어쓰지 않고 빈 줄 하나를 두고 뒤에 붙인다 */
export function appendQuote(current: string, picked: string): string {
  const text = picked.trim();
  if (text === '') return current;
  const kept = current.trimEnd();
  return kept === '' ? text : `${kept}\n\n${text}`;
}

export function fitWithin(w: number, h: number, max = MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

/** 사진을 판 안에 다 보이게 맞춘 크기 */
export function baseSize(stage: Size, image: Size): Size {
  if (image.w <= 0 || image.h <= 0) return { w: 0, h: 0 };
  const h = (stage.w * image.h) / image.w;
  if (h <= stage.h) return { w: stage.w, h };
  return { w: (stage.h * image.w) / image.h, h: stage.h };
}

function clampAxis(offset: number, stage: number, content: number): number {
  if (content <= stage) return (stage - content) / 2;
  return Math.min(0, Math.max(stage - content, offset));
}

/** 배율을 1~6으로, 사진이 판 밖으로 나가지 않게. 판보다 작으면 가운데에 둔다 */
export function clampView(v: View, stage: Size, base: Size): View {
  const z = Math.min(MAX_ZOOM, Math.max(1, v.z));
  return {
    x: clampAxis(v.x, stage.w, base.w * z),
    y: clampAxis(v.y, stage.h, base.h * z),
    z,
  };
}

/** 판 좌표 (cx, cy)가 제자리에 남도록 배율을 바꾼다 */
export function zoomAt(v: View, cx: number, cy: number, nz: number, stage: Size, base: Size): View {
  const z = Math.min(MAX_ZOOM, Math.max(1, nz));
  const k = z / v.z;
  return clampView({ x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, z }, stage, base);
}

/** 판 좌표의 점을 사진 픽셀 좌표로 */
export function toImagePoint(
  v: View,
  cx: number,
  cy: number,
  base: Size,
  image: Size
): { x: number; y: number } {
  const k = base.w > 0 ? image.w / (base.w * v.z) : 0;
  return { x: (cx - v.x) * k, y: (cy - v.y) * k };
}
