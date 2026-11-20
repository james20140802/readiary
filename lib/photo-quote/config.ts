/** 동의 시트 문구의 판 번호 — 문구를 바꾸면 올린다. 올리면 모두에게 다시 묻는다 */
export const PHOTO_TEXT_COPY_VERSION = 1;

/** 서버가 받는 사진의 상한. 기기에서 긴 변 2,000px로 줄인 JPEG는 보통 수백 KB다 */
export const PHOTO_TEXT_MAX_BYTES = 2 * 1024 * 1024;

/** 하루에 읽을 수 있는 사진 수 — DB(begin_photo_text_read)가 지킨다. 여기 값은 안내용이다 */
export const PHOTO_TEXT_DAILY_LIMIT = 30;

/** "사진으로 옮기기" 버튼을 그릴지. 서버는 이 값에 더해 Vision 키가 있어야 동작한다 */
export function photoQuoteVisible(): boolean {
  return process.env.NEXT_PUBLIC_PHOTO_QUOTE_ENABLED === 'true';
}

export type PhotoTextErrorCode =
  | 'consent_required'
  | 'daily_limit'
  | 'too_large'
  | 'read_failed'
  | 'disabled';
