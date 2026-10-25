'use client';

import { useState } from 'react';
import clsx from 'clsx';
import Chip from '@/components/ui/Chip';
import {
  RHYTHM_DAYS,
  RHYTHM_TIMES,
  strongestCell,
  type RhythmMonth,
} from '@/lib/profile/readingRhythm';

/* 걷을 때는 종이와 점이 한 장으로 같은 거리를 간다 (components/ui/Tracing.tsx와 같은 움직임) */
const MOVE =
  'transition-[transform,opacity] duration-[360ms] ease-ink-in-out motion-reduce:transition-opacity motion-reduce:duration-200';
const WITHDRAWN = 'translate-x-[calc(100cqw+24px)] opacity-0 motion-reduce:translate-x-0';
const GRID = 'grid grid-cols-[36px_repeat(7,minmax(0,1fr))] grid-rows-[24px_repeat(4,52px)]';

/** 기록이 이만큼은 있어야 무늬를 읽을 수 있다 */
const MIN_RECORDS = 6;

/*
 * 달마다 책 플래그 색 하나 — 크기만으로는 어느 달 점인지 갈리지 않았다. 오래된 달부터.
 * 같은 칸에 여러 달이 겹치면 점이 세모꼴로 살짝 비켜 앉아 색이 섞여 보인다.
 */
const MONTH_COLORS = ['bg-flag-green', 'bg-flag-pink', 'bg-flag-blue'] as const;
const OFFSETS = [
  [-5, -3],
  [5, -3],
  [0, 4],
] as const;

/**
 * 언제 읽었나 — 달마다 기록을 남긴 요일·시간대를 트레이싱지 한 장에 그 달의 색 점으로 찍고,
 * 여러 달을 겹치면 점이 모인 자리가 드러난다. 빈자리는 채워야 할 숙제가 아니다.
 */
export default function OverlappedMonths({ months }: { months: RhythmMonth[] }) {
  // 처음엔 석 달을 모두 겹쳐 둔다
  const [shown, setShown] = useState(() => months.map(() => true));
  const active = months.filter((_, i) => shown[i]);
  const records = months.reduce((n, m) => n + m.total, 0);
  const strong = strongestCell(active);

  if (records < MIN_RECORDS) {
    return (
      <p className="mt-3 font-serif text-note text-ink-sub">
        기록이 조금 더 쌓이면, 달을 겹쳐 내가 언제 읽는지 볼 수 있어요.
      </p>
    );
  }

  return (
    <div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="겹칠 달 고르기">
        {months.map((m, i) => (
          <Chip
            key={m.key}
            selected={shown[i]}
            aria-pressed={shown[i]}
            onClick={() => setShown((s) => s.map((v, k) => (k === i ? !v : v)))}
          >
            <span
              className={clsx('h-2 w-2 rounded-full', MONTH_COLORS[i % MONTH_COLORS.length])}
              aria-hidden
            />
            {m.label}
          </Chip>
        ))}
      </div>

      <div className="relative mt-4 overflow-x-clip px-1 pb-2 pt-1 [container-type:inline-size]">
        {/* 라벨과 칸 표시는 몇 장이 겹쳐도 읽히도록 종이 위에 둔다 */}
        <div className={clsx(GRID, 'relative z-10 items-center text-center')} aria-hidden>
          <span />
          {RHYTHM_DAYS.map((d) => (
            <span key={d} className="font-sans text-[13px] font-medium text-ink-sub">
              {d}
            </span>
          ))}
          {RHYTHM_TIMES.map((t) => (
            <Row key={t} label={t} />
          ))}
        </div>

        {months.map((m, k) => (
          <div
            key={m.key}
            aria-hidden
            className={clsx(
              'tracing-sheet pointer-events-none absolute inset-0 rounded-[3px] [--tracing-alpha:0.14]',
              MOVE,
              !shown[k] && WITHDRAWN
            )}
            style={{ zIndex: 1 + k }}
          >
            <div className={clsx(GRID, 'absolute inset-x-1 top-1 place-items-center')}>
              {m.cells.map((n, idx) =>
                n > 0 ? (
                  <span
                    key={idx}
                    className={clsx(
                      'rounded-full opacity-80 mix-blend-multiply dark:mix-blend-screen',
                      MONTH_COLORS[k % MONTH_COLORS.length]
                    )}
                    style={{
                      gridColumn: Math.floor(idx / RHYTHM_TIMES.length) + 2,
                      gridRow: (idx % RHYTHM_TIMES.length) + 2,
                      // 한 달 안에서 여러 번이면 조금 크게
                      width: n > 1 ? 18 : 14,
                      height: n > 1 ? 18 : 14,
                      translate: `${OFFSETS[k % OFFSETS.length][0]}px ${OFFSETS[k % OFFSETS.length][1]}px`,
                    }}
                  />
                ) : null
              )}
            </div>
          </div>
        ))}
      </div>

      <p
        className="mt-4 font-serif text-[20px] font-semibold leading-snug text-ink"
        aria-live="polite"
      >
        {strong ? (
          `${RHYTHM_DAYS[strong.day]}요일 ${RHYTHM_TIMES[strong.time]}에 가장 자주 책을 펼쳤어요.`
        ) : active.length < 2 ? (
          <span className="font-sans text-caption font-medium text-ink-sub">
            두 달 이상 겹치면 자주 펼친 때가 보여요.
          </span>
        ) : (
          <span className="font-sans text-caption font-medium text-ink-sub">
            아직 달마다 읽는 때가 제각각이에요.
          </span>
        )}
      </p>
      <p className="sr-only">{active.map((m) => `${m.label} ${m.total}개`).join(', ')}</p>
    </div>
  );
}

function Row({ label }: { label: string }) {
  return (
    <>
      <span className="font-sans text-[13px] font-medium text-ink-sub">{label}</span>
      {RHYTHM_DAYS.map((d) => (
        <span key={d} className="mx-auto h-1 w-1 rounded-full bg-hairline-strong" />
      ))}
    </>
  );
}
