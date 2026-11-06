/** 오려 붙인 조각 하나의 자세. 기울기(도)와 좌우 어긋남(px). */
export interface PastedPose {
  tilt: number;
  left: number;
  right: number;
}

// 설계 범위: 기울기 -0.5°~0.6°, 어긋남 0~12px. 처음 세 자세는 시안 C의 값이다.
// 무작위를 쓰지 않아 서버와 첫 렌더가 같고, 다시 펼쳐도 조각이 제자리에 있다.
const POSES: readonly PastedPose[] = [
  { tilt: -0.5, left: 0, right: 0 },
  { tilt: 0.6, left: 12, right: 0 },
  { tilt: -0.25, left: 0, right: 12 },
  { tilt: 0.35, left: 6, right: 0 },
  { tilt: -0.4, left: 0, right: 8 },
];

export function pastedPose(index: number): PastedPose {
  return POSES[index % POSES.length];
}

/** 조각이 차례로 붙는 지연(ms). 많아도 기다리지 않게 앞의 몇 장에만 준다. */
export function pastedDelay(index: number): number {
  return Math.min(index, 8) * 30;
}
