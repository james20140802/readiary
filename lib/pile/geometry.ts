// 간지 묶음의 자리·기울기·넘김 거리를 계산하는 순수 함수 모음.
// 시안(docs/design/concept-2026-10/pile.js)의 값을 그대로 옮겼다. DOM은 만지지 않는다.

/** 위에서 세 장 + 맨 아래 자리. 깊이마다 오른쪽 아래로 비켜 쌓인다. */
export const SLOT = [
  [0, 0],
  [16, 15],
  [32, 30],
  [48, 45],
] as const;
/** 사이에 숨은 장들이 놓이는 자리. */
export const MID = [40, 37] as const;
/** 자리별 기울기 배율. 위로 올라올수록 바로 선다. */
export const TILT = [0.22, 0.7, 0.85, 1] as const;
export const TILT_MID = 0.9;
export const FLIP_MS = 560;
export const FLIP_TURN = 0.38;
export const SETTLE_MS = 300;
export const REDUCED_MS = 160;
export const EASE_FLIP_OUT = 'cubic-bezier(.33,1,.68,1)';
export const EASE_FLIP_BACK = 'cubic-bezier(.65,0,.35,1)';

/** 종이마다 갖는 자세: 기울기(t)와 비켜 놓이는 지터. */
export type Pose = { t: number; jx: number; jy: number };
export type Placement = {
  x: number;
  y: number;
  r: number;
  z: number;
  hidden: boolean;
  top: boolean;
};

/** 직전 맨 뒷장(away)과 반대로 기울인다. 1.3~3.2도, 소수 둘째 자리까지. */
export function randomTilt(away: number, rnd: () => number): number {
  const sign = away ? -Math.sign(away) : rnd() < 0.5 ? -1 : 1;
  return +(sign * (1.3 + rnd() * 1.9)).toFixed(2);
}

/** ±4px 정수 지터. */
export function randomJitter(rnd: () => number): number {
  return Math.round((rnd() * 2 - 1) * 4);
}

/** poses는 아래→위 순서. 각 장이 놓일 자리를 계산한다. */
export function placeSlips(poses: Pose[]): Placement[] {
  const n = poses.length;
  return poses.map((p, i) => {
    const d = n - 1 - i;
    const hidden = n > 4 && d > 2 && i > 0;
    const k = n > 4 && i === 0 ? 3 : Math.min(d, 3);
    const [x, y] = hidden ? MID : SLOT[k];
    const f = hidden ? TILT_MID : TILT[k];
    const j = k && !hidden ? 1 : 0;
    return {
      x: x + j * p.jx,
      y: y + j * p.jy,
      r: +(p.t * f).toFixed(2),
      z: i + 1,
      hidden,
      top: i === n - 1,
    };
  });
}

/** 뒤로 들어갈 장이 반대로 기울 기준 장의 인덱스(순서를 바꾸기 전 배열 기준). */
export function awayIndexForBack(n: number): number {
  return n > 4 ? n - 4 : 0;
}

/** 비켜 쌓인 만큼 아래 자리를 비운다. */
export function pileMarginBottom(n: number): number {
  if (n <= 0) return 0;
  return Math.min(n - 1, 3) * 15 + 10;
}

/** 맨 위 장을 빼는 거리: 다음 장 오른쪽 끝 너머, 최소 48px는 화면에 남긴다. */
export function flipOutX(slotLeft: number, nextRight: number, viewportWidth: number): number {
  return Math.round(Math.min(nextRight + 10, viewportWidth - 48) - slotLeft);
}

export function slipTransform(p: Placement): string {
  return `translate(${p.x}px,${p.y}px) rotate(${p.r}deg)`;
}

/** 빠졌다가 방향을 바꿔 묶음 맨 아래로 돌아오는 한 번의 이어진 움직임. */
export function flipKeyframes(from: Placement, ox: number, to: Placement): Keyframe[] {
  return [
    { transform: slipTransform(from), easing: EASE_FLIP_OUT },
    {
      transform: `translate(${ox}px,-8px) rotate(3deg) scale(.985)`,
      offset: FLIP_TURN,
      easing: EASE_FLIP_BACK,
    },
    { transform: slipTransform(to) },
  ];
}

/** 끌기 한계: 화면 오른쪽 가장자리 8px 앞까지(최소 20px). */
export function dragLimit(viewportWidth: number, slipRight: number): number {
  return Math.max(20, viewportWidth - 8 - slipRight);
}

/** 한계에 가까울수록 무거워지고, 왼쪽은 16px까지만 따라간다. */
export function dragOffset(mx: number, lim: number): number {
  return mx > 0 ? lim * (1 - Math.exp(-mx / lim)) : -Math.min(16, -mx * 0.2);
}

/** 한계의 45% 이상 끌었거나 0.11px/ms보다 빠르면 넘긴다. */
export function shouldFlip(dx: number, lim: number, elapsedMs: number): boolean {
  return dx > lim * 0.45 || dx / elapsedMs > 0.11;
}

/** 세로가 먼저면 스크롤, 가로로 6px 넘기 전에는 보류. */
export function classifyDrag(mx: number, my: number): 'pending' | 'scroll' | 'drag' {
  if (Math.abs(my) > Math.abs(mx) && Math.abs(my) > 6) return 'scroll';
  if (Math.abs(mx) < 6) return 'pending';
  return 'drag';
}
