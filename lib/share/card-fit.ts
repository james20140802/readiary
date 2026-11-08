/**
 * 공유 카드의 글자 크기 고르기. 카드는 4:5(540×675)가 기본이고, 문장은 절대 자르지 않는다.
 * 넘치면 글자를 줄이고, 가장 작은 글자로도 넘치면 카드가 세로로 길어진다.
 */
export const SHARE_CARD_WIDTH = 540;
export const SHARE_CARD_HEIGHT = 675;

/** 큰 것부터. 25px는 화면의 text-quote, 16px는 휴대폰에서 읽을 수 있는 하한(1080px 이미지의 32px) */
export const QUOTE_SIZES = [25, 23, 21, 19, 17, 16] as const;

export function pickQuoteSize(fits: (size: number) => boolean): number {
  return QUOTE_SIZES.find(fits) ?? QUOTE_SIZES[QUOTE_SIZES.length - 1];
}

/** 문장에 맞춰 생각도 함께 줄인다 */
export function noteSizeFor(quoteSize: number): number {
  return Math.max(13, Math.round(quoteSize * 0.6));
}
