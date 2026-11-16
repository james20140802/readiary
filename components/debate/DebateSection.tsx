'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { fetchSectionAnswers } from '@/lib/debate/client';
import type {
  DebateAnswer,
  DebateDetail,
  DebateSection as Section,
  PickKind,
} from '@/lib/debate/types';
import { toChars } from '@/lib/debate/underline';
import AnswerItem from './AnswerItem';

interface Props {
  debate: DebateDetail;
  section: Section;
  expanded: boolean;
  onToggle(): void;
  /** 이 단락에 답하기(밑줄 번호, 문장 전체면 null) */
  onAnswer(position: number | null): void;
  onChanged(): void;
  /** 넓은 화면에서 이 단락 안에 펼칠 입력 */
  composer?: React.ReactNode;
}

const PICK_LABEL: Record<PickKind, string | null> = {
  most_moved: '생각을 가장 많이 바꾼 답',
  other_side: '다르게 본 쪽에서',
  plain: null,
};

export const sectionLabel = (debate: DebateDetail, section: Section) =>
  section.range
    ? toChars(debate.quote)
        .slice(section.range.start, section.range.end + 1)
        .join('')
    : '문장 전체';

export const sectionDomId = (section: Section) => `section-${section.position ?? 'whole'}`;

/**
 * 밑줄 하나의 단락 — 머리줄(구간·답 수·입장 분포)은 늘 보이고 접고 펴는 토글이다.
 * 펼치면 대표 답 둘, 나머지는 눌러서 이어 불러온다.
 */
export default function DebateSection({
  debate,
  section,
  expanded,
  onToggle,
  onAnswer,
  onChanged,
  composer,
}: Props) {
  const label = sectionLabel(debate, section);
  const [more, setMore] = useState<DebateAnswer[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');

  const pickIds = new Set(section.picks.map((p) => p.id));
  const rest = section.count - section.picks.length;

  const load = async (after: number) => {
    setState('loading');
    try {
      const res = await fetchSectionAnswers(debate.id, section.position, after);
      setMore((prev) => [
        ...(after === 0 ? [] : prev),
        ...res.answers.filter((a) => !pickIds.has(a.id)),
      ]);
      setNext(res.next);
      setState('done');
    } catch {
      setState('error');
    }
  };

  // 토론을 다시 불러와 단락이 바뀌면, 펼쳐 둔 나머지 답도 첫 쪽부터 다시 가져온다(숨김·고침·지움 반영)
  const lastSection = useRef(section);
  useEffect(() => {
    if (lastSection.current === section) return;
    lastSection.current = section;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 서버에서 다시 가져오는 동기화라 effect가 맞다
    if (state === 'done' || state === 'error') void load(0);
    // load는 렌더마다 새로 만들어지지만 section이 바뀔 때만 다시 가져오면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const dist = [
    section.agree > 0 && `공감 ${section.agree}`,
    section.differ > 0 && `다르게 읽음 ${section.differ}`,
    section.question > 0 && `질문 ${section.question}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const total = Math.max(section.count, 1);

  return (
    <section id={sectionDomId(section)} className="scroll-mt-28">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="block w-full pb-2 pt-6 text-left"
      >
        <span className="flex items-baseline gap-2">
          <span
            className={clsx(
              'font-serif text-[17px] font-semibold text-ink',
              section.range && 'underline decoration-accent decoration-2 underline-offset-[5px]'
            )}
          >
            {label}
          </span>
          <span className="ml-auto whitespace-nowrap font-sans text-fine font-semibold text-ink-sub">{`답 ${section.count}`}</span>
          <ChevronDown
            size={16}
            strokeWidth={1.75}
            aria-hidden
            className={clsx(
              'shrink-0 text-ink-faint transition-transform duration-200',
              expanded && 'rotate-180'
            )}
          />
        </span>
        {section.count > 0 && (
          <>
            <span aria-hidden className="mt-2 flex h-1 gap-0.5 overflow-hidden rounded-full">
              {section.agree > 0 && (
                <i className="bg-ink/55" style={{ flex: section.agree / total }} />
              )}
              {section.differ > 0 && (
                <i className="bg-accent" style={{ flex: section.differ / total }} />
              )}
              {section.question > 0 && (
                <i className="bg-ink/20" style={{ flex: section.question / total }} />
              )}
            </span>
            <span className="mt-1 block font-sans text-fine text-ink-faint">{dist}</span>
          </>
        )}
      </button>

      {expanded && (
        <div className="border-t border-hairline-strong">
          {section.count === 0 && (
            <p className="py-4 font-sans text-caption text-ink-faint">아직 답이 없어요</p>
          )}
          {section.picks.map((a, i) => (
            <AnswerItem
              key={a.id}
              debate={debate}
              answer={a}
              label={PICK_LABEL[section.pickKinds[i] ?? 'plain']}
              onChanged={onChanged}
            />
          ))}
          {more.map((a) => (
            <AnswerItem key={a.id} debate={debate} answer={a} onChanged={onChanged} />
          ))}

          {rest > 0 && state === 'idle' && (
            <button
              type="button"
              onClick={() => void load(0)}
              className="min-h-10 py-2 font-sans text-caption font-semibold text-accent"
            >
              {`나머지 ${rest}개 보기`}
            </button>
          )}
          {state === 'loading' && (
            <p className="py-2 font-sans text-caption text-ink-faint">불러오는 중…</p>
          )}
          {state === 'error' && (
            <p className="py-2 font-sans text-caption text-ink-sub">
              답을 불러오지 못했어요.{' '}
              <button
                type="button"
                className="font-semibold text-accent"
                onClick={() => void load(more.length + section.picks.length)}
              >
                다시 시도
              </button>
            </p>
          )}
          {state === 'done' && next !== null && (
            <button
              type="button"
              onClick={() => void load(next)}
              className="min-h-10 py-2 font-sans text-caption font-semibold text-accent"
            >
              더 보기
            </button>
          )}

          {debate.canAnswer && (
            <button
              type="button"
              onClick={() => onAnswer(section.position)}
              className="mt-2 inline-flex min-h-10 items-center rounded-full border border-hairline-strong px-4 font-sans text-button-sm text-ink active:scale-[0.97]"
            >
              {section.position === null ? '문장 전체에 답하기' : '이 밑줄에 답하기'}
            </button>
          )}
          {composer}
        </div>
      )}
    </section>
  );
}
