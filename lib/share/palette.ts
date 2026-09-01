import type { CSSProperties } from 'react';

/* 캡처 컨테이너는 뷰어의 다크모드와 무관하게 항상 라이트 팔레트로 찍는다.
   토큰 클래스가 CSS 변수를 읽으므로, 컨테이너에서 변수를 라이트 값으로 재정의. */
export const LIGHT_PALETTE: CSSProperties = {
  '--paper': '247 243 236',
  '--card': '253 251 247',
  '--card-raised': '242 236 225',
  '--ink': '34 30 26',
  '--ink-sub': '110 102 92',
  '--ink-faint': '163 154 141',
  '--hairline': '227 220 208',
  '--accent': '45 95 184',
} as CSSProperties;
