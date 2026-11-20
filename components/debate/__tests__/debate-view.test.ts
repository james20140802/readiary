// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TopBarProvider } from '@/components/shell/TopBarContext';
import DebateView from '../DebateView';
import { answer, debate } from './fixtures';

const sectionCalls: unknown[] = [];
let fresh: unknown = null;
vi.mock('@/lib/debate/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/debate/client')>()),
  setMove: async () => 1,
  fetchDebate: async () => fresh,
  fetchSectionAnswers: async (...a: unknown[]) => {
    sectionCalls.push(a);
    return { answers: [], next: null };
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(cleanup);

const mine = () =>
  debate({
    owner: { ...debate().owner, isMe: true },
    sections: [
      {
        position: 1,
        range: { start: 0, end: 5 },
        prompt: null,
        count: 2,
        agree: 1,
        differ: 1,
        question: 0,
        picks: [],
        pickKinds: [],
        extra: 0,
      },
    ],
  });

const renderView = (d = mine()) => render(h(TopBarProvider, null, h(DebateView, { initial: d })));

describe('DebateView', () => {
  it('넓은 화면에도 토론 메뉴가 문장 머리에 있어 정리하기·닫기를 고를 수 있다', () => {
    renderView();
    const desk = document.querySelector('[data-desktop-menu]') as HTMLElement;
    expect(desk).toBeTruthy();
    expect(desk.className).toContain('lg:');
    fireEvent.click(desk);
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByRole('button', { name: '정리하기' })).toBeTruthy();
  });

  it('밑줄 부분은 형광펜처럼 칠해 보인다', () => {
    renderView();
    // 문장 안의 밑줄(단락 머리줄의 글귀는 debate-section에서 따로 본다)
    const marks = document.querySelectorAll('[data-highlight][aria-label]');
    expect(marks.length).toBeGreaterThan(0);
    for (const m of marks) {
      // button은 inline-block으로 그려져 줄을 따라 칠해지지 않고 앞에서 줄이 끊긴다 — 줄 안에 흐르는 링크로
      expect(m.tagName).toBe('A');
      expect(m.getAttribute('href')).toBe('#section-1');
      expect(m.className).not.toMatch(/(^|\s)underline(\s|$)/);
      expect(m.className).toContain('bg-accent/');
    }
  });

  it('정리된 토론에서 고정한 답을 누르면 접힌 단락을 펴서 그 답을 보여 준다', () => {
    const pick = answer({ id: 'a1', body: '고정한 답의 본문' });
    const d = debate({
      closedAt: '2026-11-18T00:00:00Z',
      canAnswer: false,
      summary: {
        body: '정리',
        pins: [
          {
            answerId: 'a1',
            nickname: '도현',
            firstLine: '고정한 답의 본문',
            deleted: false,
            position: 1,
          },
        ],
      },
      sections: [{ ...mine().sections[0], count: 1, picks: [pick], pickKinds: ['plain'] }],
    });
    renderView(d);
    // 정리된 토론은 단락이 접힌 채 열린다
    expect(document.getElementById('answer-a1')).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: /도현 · 고정한 답의 본문/ }));
    expect(document.getElementById('answer-a1')).toBeTruthy();
  });

  it('생각이 바뀌었어요를 누르면 머리의 생각이 바뀐 사람 수도 맞추고, 펼친 답은 다시 불러오지 않는다', async () => {
    const pick = answer({ id: 'a1', movedCount: 0, movedByMe: false });
    const base = mine();
    const d = {
      ...base,
      owner: { ...base.owner, isMe: false },
      totals: { ...base.totals, movedPeople: 0 },
      sections: [{ ...base.sections[0], count: 1, picks: [pick], pickKinds: ['plain' as const] }],
    };
    fresh = { ...d, totals: { ...d.totals, movedPeople: 1 }, sections: [{ ...d.sections[0] }] };
    sectionCalls.length = 0;
    renderView(d);
    expect(screen.queryByText(/생각이 바뀐 사람/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '생각이 바뀌었어요' }));
    await waitFor(() => expect(screen.getByText(/생각이 바뀐 사람/).textContent).toContain('1'));
    expect(sectionCalls).toHaveLength(0);
  });
});
