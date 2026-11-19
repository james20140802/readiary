import { describe, expect, it } from 'vitest';
import {
  MAX_UNDERLINES,
  isValidUnderlines,
  planStroke,
  toChars,
  trimRange,
  wordAt,
} from '../underline';

const QUOTE = '경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.';

describe('toChars', () => {
  it('이모지 하나를 한 글자로 센다(DB char_length와 같은 단위)', () => {
    expect(toChars('🙂 가나')).toHaveLength(4);
  });
});

describe('trimRange', () => {
  it('앞뒤 공백과 문장부호를 걷는다', () => {
    expect(trimRange(toChars('경계와 문턱이 '), { start: 3, end: 7 })).toEqual({
      start: 4,
      end: 6,
    });
  });
  it('공백만 고르면 없음', () => {
    expect(trimRange(toChars('가 나'), { start: 1, end: 1 })).toBeNull();
  });
});

describe('wordAt', () => {
  it('누른 글자의 어절을 돌려주되 끝 문장부호는 뺀다', () => {
    const chars = toChars('타자에 대한 환상도.');
    expect(wordAt(chars, 8)).toEqual({ start: 7, end: 9 });
  });
  it('공백을 누르면 없음', () => {
    expect(wordAt(toChars('가 나'), 1)).toBeNull();
  });
});

describe('planStroke', () => {
  const three = [
    { start: 0, end: 2 },
    { start: 4, end: 6 },
    { start: 17, end: 20 },
  ];

  it('걸치거나 품은 밑줄을 하나로 합친다', () => {
    expect(planStroke(three, { start: 0, end: 6 })).toEqual({
      ok: true,
      ranges: [
        { start: 0, end: 6 },
        { start: 17, end: 20 },
      ],
      merged: 2,
    });
  });

  it('겹치지 않는 넷째 밑줄은 막는다', () => {
    expect(planStroke(three, { start: 26, end: 28 })).toEqual({ ok: false, reason: 'limit' });
  });

  it('3개일 때도 하나를 품는 획은 된다', () => {
    const res = planStroke(three, { start: 16, end: 22 });
    expect(res).toEqual({
      ok: true,
      ranges: [
        { start: 0, end: 2 },
        { start: 4, end: 6 },
        { start: 16, end: 22 },
      ],
      merged: 1,
    });
  });

  it('새 밑줄은 시작 위치 순서로 끼운다', () => {
    expect(planStroke([{ start: 10, end: 12 }], { start: 0, end: 2 })).toEqual({
      ok: true,
      ranges: [
        { start: 0, end: 2 },
        { start: 10, end: 12 },
      ],
      merged: 0,
    });
  });
});

describe('planStroke와 밑줄별 물음', () => {
  it('건드리지 않은 밑줄의 물음은 그대로, 합친 밑줄은 앞쪽의 물음을 이어받는다', () => {
    const res = planStroke(
      [
        { start: 0, end: 2, prompt: '왜 경계일까요?' },
        { start: 4, end: 6, prompt: '문턱은?' },
        { start: 17, end: 20, prompt: '환상은?' },
      ],
      { start: 1, end: 5 }
    );
    expect(res).toEqual({
      ok: true,
      ranges: [
        { start: 0, end: 6, prompt: '왜 경계일까요?' },
        { start: 17, end: 20, prompt: '환상은?' },
      ],
      merged: 2,
    });
  });
});

describe('isValidUnderlines', () => {
  const chars = toChars(QUOTE);
  it('0~3개, 문장 안, 겹침 없음', () => {
    expect(isValidUnderlines(chars, [])).toBe(true);
    expect(
      isValidUnderlines(chars, [
        { start: 0, end: 5 },
        { start: 17, end: 25 },
      ])
    ).toBe(true);
  });
  it('겹치면 거짓', () => {
    expect(
      isValidUnderlines(chars, [
        { start: 0, end: 5 },
        { start: 5, end: 8 },
      ])
    ).toBe(false);
  });
  it('넷이면 거짓', () => {
    expect(MAX_UNDERLINES).toBe(3);
    expect(
      isValidUnderlines(chars, [
        { start: 0, end: 1 },
        { start: 3, end: 4 },
        { start: 6, end: 7 },
        { start: 9, end: 10 },
      ])
    ).toBe(false);
  });
  it('범위 밖이나 뒤집힌 범위는 거짓', () => {
    expect(isValidUnderlines(chars, [{ start: 30, end: chars.length }])).toBe(false);
    expect(isValidUnderlines(chars, [{ start: 5, end: 2 }])).toBe(false);
    expect(isValidUnderlines(chars, [{ start: 0.5, end: 2 }])).toBe(false);
  });
});
