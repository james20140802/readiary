/**
 * ISBN 판별·정리. 책 뒤표지의 바코드(EAN-13)는 978·979로 시작하는 ISBN-13 그대로다.
 * 검색창에 하이픈·공백을 섞어 적은 ISBN도 같은 규칙으로 알아본다.
 */

function isbn13CheckOk(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10 === Number(digits[12]);
}

function isbn10CheckOk(chars: string): boolean {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const c = chars[i];
    const v = c === 'X' ? 10 : Number(c);
    if (c === 'X' && i !== 9) return false;
    sum += v * (10 - i);
  }
  return sum % 11 === 0;
}

/** 올바른 ISBN-13(978·979)이면 숫자만 남긴 값을, 아니면 null */
export function asIsbn13(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, '');
  if (!/^97[89]\d{10}$/.test(digits)) return null;
  return isbn13CheckOk(digits) ? digits : null;
}

/** 올바른 ISBN-10이면 대문자 X까지 포함해 정리한 값을, 아니면 null */
export function asIsbn10(raw: string): string | null {
  const chars = raw.replace(/[\s-]/g, '').toUpperCase();
  if (!/^\d{9}[\dX]$/.test(chars)) return null;
  return isbn10CheckOk(chars) ? chars : null;
}

/** 검색어가 ISBN 하나뿐이면 정리한 ISBN을 돌려준다. 제목·지은이 검색이면 null */
export function isbnQuery(query: string): string | null {
  return asIsbn13(query) ?? asIsbn10(query);
}

/** 바코드 판독 결과 가운데 책 ISBN인 것. 가격 부가 코드(5자리)나 일반 상품 바코드는 고르지 않는다 */
export function isbnFromBarcodes(values: readonly string[]): string | null {
  for (const v of values) {
    const isbn = asIsbn13(v);
    if (isbn) return isbn;
  }
  return null;
}
