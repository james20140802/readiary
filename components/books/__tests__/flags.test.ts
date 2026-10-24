import { describe, expect, it } from 'vitest';
import {
  FLAG_COLORS,
  FLAG_EDGE,
  FLAG_HIT_HALF,
  FLAG_LEN,
  FLAG_LEN_STEP,
  buildFlags,
  colorsByDay,
  flagDay,
  flagEnd,
  flagPage,
  clusterFlags,
  layoutFlags,
  rectsOverlap,
  type FlagSource,
} from '../flags';

const e = (
  id: string,
  date: string | null,
  fromPage: number | null,
  toPage: number | null = null,
  createdAt: string | null = null
): FlagSource => ({ id, date, fromPage, toPage, createdAt });

describe('flagPage', () => {
  it('시작 쪽을 쓰고, 없으면 끝 쪽', () => {
    expect(flagPage({ fromPage: 12, toPage: 20 })).toBe(12);
    expect(flagPage({ fromPage: null, toPage: 20 })).toBe(20);
  });
  it('쪽 번호가 없거나 0 이하면 플래그 없음', () => {
    expect(flagPage({ fromPage: null, toPage: null })).toBeNull();
    expect(flagPage({ fromPage: 0, toPage: null })).toBeNull();
    expect(flagPage({ fromPage: -3, toPage: null })).toBeNull();
  });
});

describe('flagEnd', () => {
  it('전체 쪽수가 있으면 그것이 끝', () => {
    expect(flagEnd(352, [{ fromPage: 400, toPage: null }])).toBe(352);
  });
  it('전체 쪽수가 없으면 기록한 가장 큰 쪽(끝 쪽 포함)', () => {
    expect(
      flagEnd(null, [
        { fromPage: 10, toPage: 30 },
        { fromPage: 25, toPage: null },
      ])
    ).toBe(30);
    expect(flagEnd(0, [{ fromPage: 8, toPage: null }])).toBe(8);
  });
  it('쪽이 하나도 없으면 null', () => {
    expect(flagEnd(null, [{ fromPage: null, toPage: null }])).toBeNull();
  });
});

describe('flagDay', () => {
  it('기록의 날짜를 그대로 쓴다', () => {
    expect(flagDay({ date: '2026-10-06' })).toBe('2026-10-06');
    expect(flagDay({ date: '2026-10-06T00:00:00' })).toBe('2026-10-06');
  });
  it('날짜가 없으면 만든 시각을 사용자 시간대의 날로 바꾼다', () => {
    // UTC 10월 5일 16시 = 서울 10월 6일 새벽 1시
    expect(flagDay({ date: null, createdAt: '2026-10-05T16:00:00Z' })).toBe('2026-10-06');
    expect(flagDay({ date: null, createdAt: '2026-10-05T16:00:00Z' }, 'America/Los_Angeles')).toBe(
      '2026-10-05'
    );
  });
});

describe('colorsByDay', () => {
  it('이른 날부터 여섯 색을 돌려 쓰고, 같은 날은 같은 색', () => {
    const days = [
      '2026-10-02',
      '2026-09-29',
      '2026-09-29',
      '2026-09-30',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
    ];
    const m = colorsByDay(days);
    expect(m.get('2026-09-29')).toBe('yellow');
    expect(m.get('2026-09-30')).toBe('pink');
    expect(m.get('2026-10-02')).toBe('orange');
    expect(m.get('2026-10-05')).toBe('green');
    expect(m.get('2026-10-06')).toBe('blue');
    expect(m.get('2026-10-07')).toBe('purple');
    expect(m.get('2026-10-08')).toBe('yellow');
    expect(m.size).toBe(7);
  });
  it('색은 flag 토큰 여섯 가지다', () => {
    expect(FLAG_COLORS).toEqual(['yellow', 'pink', 'orange', 'green', 'blue', 'purple']);
  });
});

describe('buildFlags', () => {
  it('쪽 ÷ 전체 쪽수로 세로 위치를 정하고, 쪽 없는 기록은 뺀다', () => {
    const flags = buildFlags(
      [e('a', '2026-10-06', 184), e('b', '2026-09-29', null), e('c', '2026-09-29', 96)],
      352
    );
    expect(flags.map((f) => f.id)).toEqual(['c', 'a']);
    expect(flags[0].ratio).toBeCloseTo(96 / 352);
    expect(flags[1].ratio).toBeCloseTo(184 / 352);
  });

  it('전체 쪽수가 없으면 가장 큰 기록 쪽을 끝으로 본다', () => {
    const flags = buildFlags([e('a', '2026-10-01', 50), e('b', '2026-10-02', 200)], null);
    expect(flags.find((f) => f.id === 'b')?.ratio).toBe(1);
    expect(flags.find((f) => f.id === 'a')?.ratio).toBeCloseTo(0.25);
  });

  it('전체 쪽수를 넘는 쪽은 끝에 붙는다', () => {
    expect(buildFlags([e('a', '2026-10-01', 500)], 300)[0].ratio).toBe(1);
  });

  it('같은 날 = 같은 색, 다음 날 = 다음 색. 쪽 없는 기록의 날도 차례에 든다', () => {
    const flags = buildFlags(
      [
        e('a', '2026-09-29', 23),
        e('b', '2026-09-29', 62),
        e('n', '2026-09-30', null),
        e('c', '2026-10-02', 131),
      ],
      352
    );
    const color = (id: string) => flags.find((f) => f.id === id)?.color;
    expect(color('a')).toBe('yellow');
    expect(color('b')).toBe('yellow');
    expect(color('c')).toBe('orange');
  });

  it('같은 쪽은 이른 날부터', () => {
    const flags = buildFlags([e('late', '2026-10-02', 40), e('early', '2026-10-01', 40)], 100);
    expect(flags.map((f) => f.id)).toEqual(['early', 'late']);
  });

  it('쪽을 하나도 모르면 플래그가 없다', () => {
    expect(buildFlags([e('a', '2026-10-01', null)], null)).toEqual([]);
  });
});

describe('layoutFlags', () => {
  const H = 279; // 시안 모바일 표지 186×279

  it('시안과 같이 위·아래 14px 안쪽에 쪽 비율로 선다', () => {
    const [first, last] = layoutFlags(
      [
        { id: 'a', ratio: 0 },
        { id: 'b', ratio: 1 },
      ],
      H
    );
    expect(first.y).toBe(FLAG_EDGE);
    expect(last.y).toBe(H - FLAG_EDGE);
  });

  it('떨어진 플래그는 모두 가장 짧은 길이', () => {
    const out = layoutFlags(
      [
        { id: 'a', ratio: 0.1 },
        { id: 'b', ratio: 0.5 },
        { id: 'c', ratio: 0.9 },
      ],
      H
    );
    expect(out.map((f) => f.len)).toEqual([FLAG_LEN, FLAG_LEN, FLAG_LEN]);
    expect(out.every((f) => f.tier === 0)).toBe(true);
  });

  it('몰린 플래그는 길이를 한 단씩 달리하고 세 단 뒤에 처음으로 돌아간다', () => {
    const out = layoutFlags(
      [0.5, 0.505, 0.51, 0.515, 0.52].map((ratio, i) => ({ id: String(i), ratio })),
      H
    );
    expect(out.map((f) => f.tier)).toEqual([0, 1, 2, 0, 1]);
    expect(out.map((f) => f.len)).toEqual([
      FLAG_LEN,
      FLAG_LEN + FLAG_LEN_STEP,
      FLAG_LEN + 2 * FLAG_LEN_STEP,
      FLAG_LEN,
      FLAG_LEN + FLAG_LEN_STEP,
    ]);
    // 짧은 것이 앞에
    expect(out[0].z).toBeGreaterThan(out[1].z);
    expect(out[1].z).toBeGreaterThan(out[2].z);
  });

  it('시안의 기록 아홉 개(352쪽)를 시안과 같은 단계로 세운다', () => {
    const pages = [23, 62, 96, 101, 108, 131, 176, 181, 184];
    const out = layoutFlags(
      pages.map((p) => ({ id: String(p), ratio: p / 352 })),
      H
    );
    // 96·101·108은 붙어 있고, 176·181·184도 붙어 있다
    expect(out.map((f) => f.tier)).toEqual([0, 0, 0, 1, 2, 0, 0, 1, 2]);
  });

  it('높이를 모르면 아무것도 세우지 않는다', () => {
    expect(layoutFlags([{ id: 'a', ratio: 0.5 }], 0)).toEqual([]);
  });
});

describe('clusterFlags', () => {
  const H = 279;
  const lay = (ratios: number[]) =>
    layoutFlags(
      ratios.map((ratio, i) => ({ id: String(i), ratio })),
      H
    );

  it('떨어진 플래그는 하나씩, 플래그 길이만큼 눌린다', () => {
    const out = clusterFlags(lay([0.1, 0.5, 0.9]));
    expect(out.map((c) => c.ids)).toEqual([['0'], ['1'], ['2']]);
    for (const c of out) {
      expect(c.hit.x0).toBe(0);
      expect(c.hit.x1).toBe(FLAG_LEN);
      expect(c.hit.y1 - c.hit.y0).toBe(FLAG_HIT_HALF * 2);
    }
  });

  it('누름 영역이 겹칠 만큼 가까운 플래그는 한 묶음이 되고, 가장 긴 플래그 끝까지 눌린다', () => {
    const layout = lay([0.5, 0.51, 0.52, 0.9]);
    const [group, alone] = clusterFlags(layout);
    expect(group.ids).toEqual(['0', '1', '2']);
    expect(alone.ids).toEqual(['3']);
    expect(group.hit.x1).toBe(Math.max(...layout.slice(0, 3).map((l) => l.len)));
    expect(group.hit.y0).toBe(layout[0].y - FLAG_HIT_HALF);
    expect(group.hit.y1).toBe(layout[2].y + FLAG_HIT_HALF);
  });

  it('같은 쪽에 일곱 기록이 몰리면 손가락 크기의 버튼 하나에 일곱 기록이 모인다', () => {
    const [only, ...rest] = clusterFlags(lay(Array(7).fill(0.5)));
    expect(rest).toEqual([]);
    expect(only.ids).toHaveLength(7);
    expect(only.hit.y1 - only.hit.y0).toBeGreaterThanOrEqual(FLAG_HIT_HALF * 2);
  });

  it('어떤 배치에서도 묶음끼리 겹치지 않고, 모든 플래그가 한 묶음에 든다', () => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let round = 0; round < 200; round++) {
      const n = 1 + Math.floor(rand() * 30);
      const ratios = Array.from({ length: n }, () =>
        rand() < 0.3 ? Math.round(rand() * 4) / 4 : rand()
      ).sort((a, b) => a - b);
      const out = clusterFlags(
        layoutFlags(
          ratios.map((ratio, i) => ({ id: String(i), ratio })),
          200 + rand() * 300
        )
      );
      expect(out.flatMap((c) => c.ids).sort()).toEqual(ratios.map((_, i) => String(i)).sort());
      for (let i = 0; i < out.length; i++)
        for (let j = i + 1; j < out.length; j++)
          expect(rectsOverlap(out[i].hit, out[j].hit), `${round}:${i}-${j}`).toBe(false);
    }
  });
});
