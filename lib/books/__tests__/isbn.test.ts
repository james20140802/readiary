import { describe, expect, it } from 'vitest';
import { asIsbn10, asIsbn13, isbnFromBarcodes, isbnQuery } from '../isbn';

describe('ISBN 판별', () => {
  it('하이픈·공백을 걷어 낸 올바른 ISBN-13만 받는다', () => {
    expect(asIsbn13('978-89-364-3426-7')).toBe('9788936434267');
    expect(asIsbn13('979 11 6040 727 3')).toBe('9791160407273');
    expect(asIsbn13('9788936434268')).toBeNull(); // 검증 숫자 틀림
    expect(asIsbn13('8801234567893')).toBeNull(); // 책이 아닌 상품 바코드
  });

  it('ISBN-10은 X 검증 숫자까지 알아본다', () => {
    expect(asIsbn10('89-364-3426-8')).toBe('8936434268');
    expect(asIsbn10('080442957x')).toBe('080442957X');
    expect(asIsbn10('8936434269')).toBeNull();
  });

  it('검색어가 ISBN 하나일 때만 ISBN 검색으로 본다', () => {
    expect(isbnQuery(' 978-89-364-3426-7 ')).toBe('9788936434267');
    expect(isbnQuery('소년이 온다')).toBeNull();
    expect(isbnQuery('1984')).toBeNull();
  });

  it('바코드 여럿 가운데 책 ISBN을 고른다', () => {
    expect(isbnFromBarcodes(['15000', '9788936434267'])).toBe('9788936434267');
    expect(isbnFromBarcodes(['8801234567893'])).toBeNull();
    expect(isbnFromBarcodes([])).toBeNull();
  });
});
