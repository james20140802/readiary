'use client';

import { useEffect, useRef } from 'react';
import s from './landing.module.css';

export const WRITING_DEMO_TEXT = '가진 것을 잃을까 두려운 마음이 나를 가장 많이 붙잡고 있었다.';

/**
 * 쓰는 장면 — 화면에 들어오면 한 번만 한 글자씩 적히고, 다 적히면 "남겼어요" 간지가 얹힌다.
 * 동작 줄이기에서는 처음부터 다 적힌 그림으로 둔다. 실제 입력창이 아닌 그림이라 보조기기에는
 * 옆 문단이 설명을 맡고 이 장면은 감춘다.
 */
export default function LandingWritingPad() {
  const padRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const pad = padRef.current;
    const tw = textRef.current;
    if (!pad || !tw) return;
    const finish = () => {
      pad.dataset.done = '';
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      tw.textContent = WRITING_DEMO_TEXT;
      finish();
      return;
    }
    const chars = [...WRITING_DEMO_TEXT];
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        let i = 0;
        const step = () => {
          i += 1;
          tw.textContent = chars.slice(0, i).join('');
          if (i < chars.length) later(step, i % 7 === 0 ? 140 : 65);
          else later(finish, 400);
        };
        later(step, 300);
      },
      { threshold: 0.6 }
    );
    io.observe(pad);
    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div ref={padRef} className={s.pad} aria-hidden="true" data-testid="landing-pad">
      <div className={s.dd}>
        <b>6</b>
        <span>10월 · 화요일</span>
      </div>
      <div className={s.tabs}>
        <span className={s.on}>책의 문장</span>
        <span>나의 생각</span>
        <span>필사</span>
      </div>
      <div className={s.tw}>
        <span ref={textRef} />
        <i className={s.caret} />
      </div>
      <div className={s.row}>
        <span>소유냐 존재냐 · p.184</span>
        <span className={s.fakeBtn}>남기기</span>
      </div>
      <div className={`${s.ok} vellum`}>남겼어요 · 이번 주 두 번째 문장</div>
    </div>
  );
}
