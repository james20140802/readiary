/** 사진 픽셀 좌표의 상자 */
export type Box = [x0: number, y0: number, x1: number, y1: number];

/** 사진에서 읽은 낱말 하나. `sep`은 이 낱말 뒤에 붙일 글자(띄어쓰기 한 칸 또는 빈 문자열) */
export interface PhotoWord {
  text: string;
  box: Box;
  sep: string;
}

/** `POST /api/photo-text`의 응답 — 사진과 글 자체는 어디에도 저장하지 않는다 */
export interface PhotoText {
  width: number;
  height: number;
  words: PhotoWord[];
}

/** 고르는 판에서 사진이 놓인 자리 — 화면 px 이동과 배율 */
export interface View {
  x: number;
  y: number;
  z: number;
}

export interface Size {
  w: number;
  h: number;
}
