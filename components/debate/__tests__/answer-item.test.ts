// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AnswerItem from '../AnswerItem';
import { answer, debate } from './fixtures';

vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  onchange: null,
  dispatchEvent: () => false,
}));
afterEach(cleanup);

describe('AnswerItem', () => {
  it('다시 불러온 답의 새 답글과 생각이 바뀐 수를 그린다', () => {
    const before = answer({ id: 'a1', replies: [], replyCount: 0, movedCount: 0 });
    const view = render(h(AnswerItem, { debate: debate(), answer: before, onChanged: vi.fn() }));
    expect(screen.queryByText('방금 단 답글')).toBeNull();
    const reply = answer({ id: 'r1', stance: null, body: '방금 단 답글', replies: null });
    view.rerender(
      h(AnswerItem, {
        debate: debate(),
        answer: { ...before, replies: [reply], replyCount: 1, movedCount: 2 },
        onChanged: vi.fn(),
      })
    );
    expect(screen.getByText('방금 단 답글')).toBeTruthy();
    expect(screen.getByRole('button', { name: '생각이 바뀌었어요 2' })).toBeTruthy();
  });
});
