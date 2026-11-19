// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AnswerItem from '../AnswerItem';

const report = vi.fn();
// 실패는 vi.fn 대신 평범한 함수로 흉내 낸다 — 거부된 결과를 테스트 실패로 보고하지 않게
let moveFails = false;
vi.mock('@/lib/debate/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/debate/client')>()),
  report: (...a: unknown[]) => report(...a),
  setMove: async () => {
    if (moveFails) throw new Error('반영하지 못했어요.');
    return 1;
  },
}));
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

  it('신고를 보내면 그 답이 바로 접히고 신고하기가 사라진다', async () => {
    report.mockReset().mockResolvedValue(undefined);
    render(h(AnswerItem, { debate: debate(), answer: answer({ id: 'a1' }), onChanged: vi.fn() }));
    fireEvent.click(screen.getByRole('button', { name: '답 메뉴' }));
    fireEvent.click(screen.getByRole('button', { name: '신고하기' }));
    fireEvent.click(screen.getByRole('radio', { name: '광고·도배' }));
    fireEvent.click(screen.getByRole('button', { name: '신고 보내기' }));
    await waitFor(() => expect(screen.getByText(/신고한 답이에요/)).toBeTruthy());
    expect(report).toHaveBeenCalledWith('d1', { answerId: 'a1', reason: 'spam', memo: null });
    fireEvent.click(screen.getByRole('button', { name: '펼치기' }));
    // 남의 답에서 할 수 있던 일은 신고뿐이라, 신고하고 나면 메뉴도 없다
    expect(screen.queryByRole('button', { name: '답 메뉴' })).toBeNull();
    expect(screen.queryByRole('button', { name: '신고하기' })).toBeNull();
  });

  it('생각이 바뀌었어요를 저장하면 토론 전체 수를 맞추라고 알린다, 실패하면 알리지 않는다', async () => {
    moveFails = false;
    const onMoved = vi.fn();
    const view = render(
      h(AnswerItem, {
        debate: debate(),
        answer: answer({ id: 'a1', movedCount: 0, movedByMe: false }),
        onChanged: vi.fn(),
        onMoved,
      })
    );
    fireEvent.click(screen.getByRole('button', { name: '생각이 바뀌었어요' }));
    await waitFor(() => expect(onMoved).toHaveBeenCalledTimes(1));
    view.unmount();

    moveFails = true;
    const onMoved2 = vi.fn();
    render(
      h(AnswerItem, {
        debate: debate(),
        answer: answer({ id: 'a2', movedCount: 0, movedByMe: false }),
        onChanged: vi.fn(),
        onMoved: onMoved2,
      })
    );
    fireEvent.click(screen.getByRole('button', { name: '생각이 바뀌었어요' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '생각이 바뀌었어요' }).getAttribute('aria-pressed')
      ).toBe('false')
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(onMoved2).not.toHaveBeenCalled();
    moveFails = false;
  });
});
