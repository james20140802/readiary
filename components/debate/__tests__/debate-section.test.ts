// @vitest-environment jsdom
import { createElement as h, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DebateSection from '../DebateSection';
import type { DebateSection as Section } from '@/lib/debate/types';
import { answer, debate } from './fixtures';

const fetchSectionAnswers = vi.fn();
vi.mock('@/lib/debate/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/debate/client')>()),
  fetchSectionAnswers: (...a: unknown[]) => fetchSectionAnswers(...a),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const p1 = answer({ id: 'a1', movedCount: 5 });
const p2 = answer({
  id: 'a2',
  stance: 'agree',
  body: '오래 만난 사람일수록 묻지 않게 되더라고요.',
});
const section = (over: Partial<Section> = {}): Section => ({
  position: 2,
  range: { start: 17, end: 25 },
  prompt: null,
  count: 9,
  agree: 3,
  differ: 5,
  question: 1,
  picks: [p1, p2],
  pickKinds: ['most_moved', 'other_side'],
  ...over,
});

function Harness({ s, onAnswer = vi.fn() }: { s: Section; onAnswer?: (p: number | null) => void }) {
  const [open, setOpen] = useState(true);
  return h(DebateSection, {
    debate: debate(),
    section: s,
    expanded: open,
    onToggle: () => setOpen((v) => !v),
    onAnswer,
    onChanged: vi.fn(),
  });
}

beforeEach(() => fetchSectionAnswers.mockReset());
afterEach(cleanup);

describe('DebateSection', () => {
  it('머리줄은 접어도 답 수와 입장 분포를 남긴다', () => {
    render(h(Harness, { s: section() }));
    const toggle = screen.getByRole('button', { name: /타자에 대한 환상/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('생각을 가장 많이 바꾼 답')).toBeTruthy();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('생각을 가장 많이 바꾼 답')).toBeNull();
    expect(screen.getByText('답 9')).toBeTruthy();
    expect(screen.getByText('공감 3 · 다르게 읽음 5 · 질문 1')).toBeTruthy();
  });

  it('머리줄의 밑줄 글귀는 문장과 같은 형광펜으로 칠한다', () => {
    render(h(Harness, { s: section() }));
    const mark = document.querySelector('[data-highlight]') as HTMLElement;
    expect(mark.className).toContain('bg-accent/');
    expect(mark.className).not.toMatch(/(^|\s)underline(\s|$)/);
  });

  it('발제자가 밑줄에 덧붙인 물음을 머리줄 아래에 보인다', () => {
    render(h(Harness, { s: section({ prompt: '환상이 사라지면 무엇이 남을까요?' }) }));
    expect(screen.getByText('환상이 사라지면 무엇이 남을까요?')).toBeTruthy();
  });

  it('대표 답 라벨: 둘째는 다르게 본 쪽에서, plain이면 라벨 없음', () => {
    render(h(Harness, { s: section() }));
    expect(screen.getByText('다르게 본 쪽에서')).toBeTruthy();
    cleanup();
    render(h(Harness, { s: section({ pickKinds: ['plain', 'plain'] }) }));
    expect(screen.queryByText('생각을 가장 많이 바꾼 답')).toBeNull();
    expect(screen.queryByText('다르게 본 쪽에서')).toBeNull();
  });

  it('나머지를 펼치면 대표 답을 빼고 이어 붙인다', async () => {
    fetchSectionAnswers.mockResolvedValue({
      answers: [p1, p2, answer({ id: 'a3', body: '셋째 답' })],
      next: null,
    });
    render(h(Harness, { s: section() }));
    fireEvent.click(screen.getByRole('button', { name: '나머지 7개 보기' }));
    expect(await screen.findByText('셋째 답')).toBeTruthy();
    expect(fetchSectionAnswers).toHaveBeenCalledWith('d1', 2, 0);
    expect(screen.getAllByText('사라지는 건 상상 속의 상대뿐이에요.')).toHaveLength(1);
  });

  it('토론을 다시 불러오면 펼쳐 둔 나머지 답도 다시 가져온다', async () => {
    fetchSectionAnswers.mockResolvedValue({
      answers: [answer({ id: 'a3', body: '셋째 답' })],
      next: null,
    });
    const props = {
      debate: debate(),
      expanded: true,
      onToggle: vi.fn(),
      onAnswer: vi.fn(),
      onChanged: vi.fn(),
    };
    const view = render(h(DebateSection, { ...props, section: section() }));
    fireEvent.click(screen.getByRole('button', { name: '나머지 7개 보기' }));
    expect(await screen.findByText('셋째 답')).toBeTruthy();
    fetchSectionAnswers.mockResolvedValue({
      answers: [answer({ id: 'a3', body: '고친 셋째 답' })],
      next: null,
    });
    view.rerender(h(DebateSection, { ...props, section: section() }));
    expect(await screen.findByText('고친 셋째 답')).toBeTruthy();
    expect(fetchSectionAnswers).toHaveBeenCalledTimes(2);
  });

  it('답이 없으면 비어 있다고 말하고, 답하기를 누르면 그 밑줄로', () => {
    const onAnswer = vi.fn();
    render(
      h(Harness, {
        s: section({ count: 0, agree: 0, differ: 0, question: 0, picks: [], pickKinds: [] }),
        onAnswer,
      })
    );
    expect(screen.getByText('아직 답이 없어요')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '이 밑줄에 답하기' }));
    expect(onAnswer).toHaveBeenCalledWith(2);
  });

  it('문장 전체 단락', () => {
    render(h(Harness, { s: section({ position: null, range: null }) }));
    const toggle = screen.getByRole('button', { expanded: true });
    expect(toggle.textContent).toContain('문장 전체');
    expect(screen.getByRole('button', { name: '문장 전체에 답하기' })).toBeTruthy();
  });
});
