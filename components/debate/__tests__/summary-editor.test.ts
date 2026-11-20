// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SummaryEditor from '../SummaryEditor';
import { answer, debate } from './fixtures';

afterEach(cleanup);

describe('SummaryEditor', () => {
  it('고정했던 답이 대표 답에서 빠져도 보여 주어 풀거나 바꿀 수 있다', () => {
    const d = debate({
      closedAt: '2026-11-18T00:00:00Z',
      summary: {
        body: '정리',
        pins: [
          {
            answerId: 'old1',
            nickname: '도현',
            firstLine: '예전 첫 답',
            deleted: false,
            position: 1,
          },
          {
            answerId: 'old2',
            nickname: '서연',
            firstLine: '예전 둘째 답',
            deleted: false,
            position: null,
          },
        ],
      },
      sections: [
        {
          position: 1,
          range: { start: 0, end: 5 },
          prompt: null,
          count: 1,
          extra: 0,
          agree: 0,
          differ: 1,
          question: 0,
          picks: [answer({ id: 'new', body: '지금의 대표 답' })],
          pickKinds: ['plain'],
        },
      ],
    });
    render(h(SummaryEditor, { open: true, onClose: vi.fn(), debate: d, onSaved: vi.fn() }));
    const old = screen.getByRole('button', { name: /예전 첫 답/ });
    expect(old.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /예전 둘째 답/ }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    const fresh = screen.getByRole('button', { name: /지금의 대표 답/ }) as HTMLButtonElement;
    expect(fresh.disabled).toBe(true);
    fireEvent.click(old);
    expect(old.getAttribute('aria-pressed')).toBe('false');
    expect(fresh.disabled).toBe(false);
  });
});
