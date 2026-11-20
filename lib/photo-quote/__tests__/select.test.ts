import { describe, expect, it } from 'vitest';
import {
  allText,
  appendQuote,
  baseSize,
  clampView,
  fitWithin,
  lineBands,
  orderRange,
  rangeText,
  toImagePoint,
  wordAt,
  zoomAt,
} from '../select';
import type { Box, PhotoWord } from '../types';

const W = (text: string, box: Box, sep = ' '): PhotoWord => ({ text, box, sep });
const line = [
  W('책을', [0, 0, 40, 20]),
  W('읽는', [50, 0, 90, 20]),
  W('일', [100, 0, 120, 20], ''),
];

describe('고른 글 잇기', () => {
  it('고른 구간을 띄어쓰기 정보로 잇고 마지막 뒤는 버린다', () => {
    expect(rangeText(line, 0, 1)).toBe('책을 읽는');
    expect(rangeText(line, 2, 0)).toBe('책을 읽는 일');
    expect(rangeText([W('well', [0, 0, 1, 1], ''), W('known', [0, 2, 1, 3])], 0, 1)).toBe(
      'wellknown'
    );
  });

  it('뒤집힌 구간을 앞뒤 순서로 정리한다', () => {
    expect(orderRange(2, 0)).toEqual([0, 2]);
    expect(orderRange(1, 1)).toEqual([1, 1]);
  });

  it('빈 낱말 목록은 빈 글이고 잡히는 낱말이 없다', () => {
    expect(allText([])).toBe('');
    expect(rangeText([], 0, 3)).toBe('');
    expect(wordAt([], 5, 5)).toBe(-1);
  });

  it('전부 가져오면 모든 낱말을 잇는다', () => {
    expect(allText(line)).toBe('책을 읽는 일');
  });
});

describe('낱말 찾기', () => {
  const two = [...line, W('아래', [100, 30, 140, 50])];

  it('손가락 아래 낱말을 잡는다', () => {
    expect(wordAt(two, 60, 10)).toBe(1);
  });

  it('낱말 사이에서는 위아래 줄보다 같은 줄의 가까운 낱말을 먼저 잡는다', () => {
    expect(wordAt(two, 135, 12)).toBe(2);
  });
});

describe('문장 칸에 넣기', () => {
  it('비어 있으면 그대로 넣는다', () => {
    expect(appendQuote('', '새 문장')).toBe('새 문장');
    expect(appendQuote('  \n', '새 문장')).toBe('새 문장');
  });

  it('글이 있으면 빈 줄 하나를 두고 뒤에 붙인다', () => {
    expect(appendQuote('쓰던 글', '새 문장')).toBe('쓰던 글\n\n새 문장');
    expect(appendQuote('쓰던 글\n\n', '새 문장')).toBe('쓰던 글\n\n새 문장');
  });

  it('고른 글이 없으면 쓰던 글을 건드리지 않는다', () => {
    expect(appendQuote('쓰던 글', '')).toBe('쓰던 글');
  });
});

describe('사진 크기와 보기', () => {
  const stage = { w: 300, h: 400 };
  const base = { w: 300, h: 400 };

  it('긴 변을 2000으로 줄이고 작은 사진은 그대로 둔다', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1500, height: 2000 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('사진을 판 안에 맞춘다 — 가로가 남으면 세로 기준', () => {
    expect(baseSize({ w: 300, h: 400 }, { w: 1500, h: 2000 })).toEqual({ w: 300, h: 400 });
    expect(baseSize({ w: 800, h: 400 }, { w: 1500, h: 2000 })).toEqual({ w: 300, h: 400 });
  });

  it('키워도 가리킨 점이 제자리에 있고 배율은 1~6이다', () => {
    const v = zoomAt({ x: 0, y: 0, z: 1 }, 150, 200, 2, stage, base);
    expect(v).toEqual({ x: -150, y: -200, z: 2 });
    expect(zoomAt(v, 0, 0, 99, stage, base).z).toBe(6);
    expect(zoomAt(v, 0, 0, 0.1, stage, base)).toEqual({ x: 0, y: 0, z: 1 });
  });

  it('사진을 판 밖으로 끌고 나갈 수 없다', () => {
    expect(clampView({ x: 50, y: 50, z: 1 }, stage, base)).toEqual({ x: 0, y: 0, z: 1 });
    expect(clampView({ x: -999, y: -999, z: 2 }, stage, base)).toEqual({ x: -300, y: -400, z: 2 });
  });

  it('판보다 작은 사진은 가운데에 둔다', () => {
    expect(clampView({ x: 0, y: 0, z: 1 }, { w: 800, h: 400 }, base)).toEqual({
      x: 250,
      y: 0,
      z: 1,
    });
  });

  it('화면의 점을 사진 좌표로 바꾼다', () => {
    const image = { w: 1500, h: 2000 };
    expect(toImagePoint({ x: -150, y: -200, z: 2 }, 150, 200, base, image)).toEqual({
      x: 750,
      y: 1000,
    });
  });
});

describe('고른 구간 칠하기', () => {
  const page = [
    W('첫', [10, 10, 40, 30]),
    W('줄', [50, 12, 80, 32]),
    W('둘째', [10, 40, 60, 60]),
    W('줄', [70, 41, 100, 61]),
  ];

  it('같은 줄의 낱말은 틈 없이 한 띠로 잇는다', () => {
    expect(lineBands(page, 0, 1)).toEqual([[10, 10, 80, 32]]);
  });

  it('줄이 바뀌면 띠를 나눈다', () => {
    expect(lineBands(page, 1, 3)).toEqual([
      [50, 12, 80, 32],
      [10, 40, 100, 61],
    ]);
  });

  it('뒤집힌 구간과 빈 목록도 받는다', () => {
    expect(lineBands(page, 3, 2)).toEqual([[10, 40, 100, 61]]);
    expect(lineBands([], 0, 2)).toEqual([]);
  });
});
