// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TopBarProvider } from '@/components/shell/TopBarContext';
import DebateView from '../DebateView';
import { debate } from './fixtures';

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
});
