/**
 * 법적 고지 본문(순수 텍스트)을 화면에 그릴 수 있는 블록으로 나눈다.
 * 빈 줄이 문단 경계이고, "제n조 (…)"로 시작하는 첫 줄은 조문 제목이다.
 * 본문을 마크다운이나 JSX로 옮기지 않는 이유는 동의 모달(ConsentFieldset)과 공개 페이지가
 * 같은 문자열을 나눠 써야 하기 때문이다.
 */

export interface LegalBlock {
  /** 조문 제목 — "제1조 (목적)". 없으면 null */
  heading: string | null;
  /** 제목을 뺀 나머지 줄. 줄바꿈은 그대로 둔다 */
  body: string;
}

const HEADING = /^제\d+조(\s*\(.*\))?$/;

export function splitLegalBlocks(text: string): LegalBlock[] {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk !== '')
    .map((chunk) => {
      const [first, ...rest] = chunk.split('\n');
      if (HEADING.test(first.trim())) {
        return { heading: first.trim(), body: rest.join('\n').trim() };
      }
      return { heading: null, body: chunk };
    });
}
