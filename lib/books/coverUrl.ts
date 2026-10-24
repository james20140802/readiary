const KAKAO_THUMB = /^https:\/\/search1\.kakaocdn\.net\/thumb\/[^/?]+\/?\?/;
const DAUM_BOOK = /^https?:\/\/t1\.daumcdn\.net\/lbook\/image\/\d+(?:\?timestamp=\d+)?$/;

/**
 * 카카오 책 검색의 썸네일(120×174)을 그 안에 든 원본 표지(가로 약 450px)로 바꾼다.
 * 썸네일 주소의 fname이 다음 책 이미지 원본을 가리킬 때만 바꾸고, 그 밖의 주소는 그대로 둔다.
 * supabase/migrations/20261025090000_book_covers_original.sql이 이미 저장된 표지를 같은 규칙으로 바꿨다.
 */
export function originalCoverUrl(url: string): string;
export function originalCoverUrl(url: string | null | undefined): string | null;
export function originalCoverUrl(url: string | null | undefined): string | null {
  if (!url) return url ?? null;
  if (!KAKAO_THUMB.test(url)) return url;
  let fname: string | null;
  try {
    fname = new URL(url).searchParams.get('fname');
  } catch {
    return url;
  }
  if (!fname || !DAUM_BOOK.test(fname)) return url;
  return fname.replace(/^http:/, 'https:');
}
