'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface ClampedTextProps {
  children: ReactNode;
  /** 접힌 상태에서 바닥에 까는 페이드 그라데이션 시작 색 — 감싸는 배경에 맞춘다(기본 지면색) */
  fadeFromClassName?: string;
  /** 바깥 wrapper에 얹을 클래스 */
  className?: string;
}

/**
 * 긴 문장 접기/펼치기 — EntryCard가 쓰던 패턴을 다른 카드(회상 카드 등)에서도 쓸 수 있게 뺀 것.
 * 접힌 높이(17em)보다 실제 내용이 길 때만 페이드 + '계속 읽기 ↓' 버튼을 보여준다.
 * clientHeight 대신 17em을 기준으로 재는 이유: 펼친 상태에서 리사이즈가 와도
 * '접기' 버튼이 사라지지 않아야 하므로. 회전·리사이즈·폰트 지연 로드에도 ResizeObserver로 재측정.
 */
export default function ClampedText({
  children,
  fadeFromClassName = 'from-paper',
  className,
}: ClampedTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => {
      const collapsedMax = parseFloat(getComputedStyle(el).fontSize) * 17;
      setIsClamped(el.scrollHeight > collapsedMax + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div className={className}>
      <div className="relative">
        <div ref={bodyRef} className={isExpanded ? undefined : 'max-h-[17em] overflow-hidden'}>
          {children}
        </div>
        {isClamped && !isExpanded && (
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t ${fadeFromClassName} to-transparent`}
          />
        )}
      </div>
      {isClamped && (
        <button
          type="button"
          onClick={(e) => {
            // 클릭 가능한 조상이 있어도 접기/펼치기만 하고 이동하지 않는다.
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded((v) => !v);
          }}
          // relative z-10: 카드 전체를 덮는 overlay 링크(회상 카드) 위에 올라와야 눌린다
          className="relative z-10 mt-2 font-serif text-[12.5px] text-ink-faint transition-colors hover:text-accent"
        >
          {isExpanded ? '접기 ↑' : '계속 읽기 ↓'}
        </button>
      )}
    </div>
  );
}
