'use client';

import { useEffect, useRef } from 'react';
import s from './landing.module.css';

/**
 * 다시 만나는 장면 — 1년 전 기록 위로 덧붙인 생각 간지 두 장이 얹힌다.
 * 간지 가장자리는 줄 사이에: 첫 간지의 위쪽 가장자리를 '그때의 생각' 줄 바로 위에 맞추고,
 * 두 번째 간지는 첫 간지 아래쪽에 조금 겹치게 둔다. 서체가 늦게 오거나 폭이 바뀌면 다시 잰다.
 */
export default function LandingAgainStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const overRef = useRef<HTMLDivElement>(null);
  const over2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const st = stageRef.current;
    const n = noteRef.current;
    const o1 = overRef.current;
    const o2 = over2Ref.current;
    if (!st || !n || !o1 || !o2) return;
    const fit = () => {
      // 기울어진 바탕 종이 안의 줄 위치 — offsetTop은 transform에 영향받지 않아 스크롤 애니메이션 중에도 같다
      const base = n.offsetParent as HTMLElement | null;
      const line = (base?.offsetTop ?? 0) + n.offsetTop;
      o1.style.top = `${line + 2}px`;
      o2.style.top = `${line + o1.offsetHeight - 14}px`;
    };
    fit();
    void document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(st);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={stageRef} className={s.astage} aria-hidden="true">
      <div className={s.base}>
        <div className={s.k}>2025. 10. 6. 에로스의 종말 p.42</div>
        <div className={s.q}>경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.</div>
        <div ref={noteRef} className={s.n}>
          가까워질수록 모르는 부분이 줄어드는 게 꼭 좋은 걸까.
        </div>
      </div>
      <div ref={overRef} className={`${s.v} ${s.over}`}>
        <div className={s.k}>이틀 뒤</div>
        <div className={s.s}>이 문장을 친구에게 보냈다.</div>
      </div>
      <div ref={over2Ref} className={`${s.v} ${s.over2}`}>
        <div className={s.k}>1년 뒤, 오늘</div>
        <div className={s.s}>모르는 채로 남겨 두는 것도 존중일지 모른다.</div>
      </div>
    </div>
  );
}
