import type { CSSProperties } from 'react';
import type { Transition } from 'framer-motion';

/**
 * 움직임 토큰 — app/globals.css의 --ease-*와 같은 값이다(CSS와 Tailwind는 거기서, framer는 여기서 쓴다).
 * 새 곡선을 만들기 전에 아래 중 하나로 되는지 본다.
 */

/** 들어오고 나가는 UI — 빠르게 시작해 조용히 멈춘다 */
export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/** 화면 안에서 자리를 옮길 때 */
export const EASE_IN_OUT: [number, number, number, number] = [0.77, 0, 0.175, 1];

/** 시트·서랍 */
export const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1];

/** 책장을 넘기는 3D 동작 전용(CSS는 --ease-page) — 부드럽게 가속해 부드럽게 멈춘다. 다른 곳에 쓰지 않는다 */
export const EASE_PAGE: [number, number, number, number] = [0.4, 0, 0.2, 1];

/** 바닥에서 올라오는 시트 — 스프링처럼 출렁이지 않고 바닥에 붙은 채 올라온다 */
export const SHEET_TRANSITION: Transition = { duration: 0.35, ease: EASE_DRAWER };

/** 목록 차례 등장(.ink-in)의 순번 — 0부터. 여섯 번째부터는 globals.css에서 같은 때로 묶인다 */
export const inkIn = (i: number): CSSProperties => ({ '--i': i }) as CSSProperties;
