// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AnswerComposer from '../AnswerComposer';

const postAnswer = vi.fn();
const postReply = vi.fn();
vi.mock('@/lib/debate/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/debate/client')>()),
  postAnswer: (...a: unknown[]) => postAnswer(...a),
  postReply: (...a: unknown[]) => postReply(...a),
}));

beforeEach(() => {
  localStorage.clear();
  postAnswer.mockReset().mockResolvedValue({ id: 'new' });
  postReply.mockReset().mockResolvedValue({ id: 'r' });
});
afterEach(cleanup);

const answerTarget = { kind: 'answer' as const, position: 2, label: '타자에 대한 환상' };

describe('AnswerComposer', () => {
  it('입장과 글이 모두 있어야 남길 수 있다', async () => {
    const onDone = vi.fn();
    render(h(AnswerComposer, { debateId: 'd1', target: answerTarget, onDone, onCancel: vi.fn() }));
    expect(screen.getByText('‘타자에 대한 환상’을 어떻게 읽었나요')).toBeTruthy();
    const send = screen.getByRole('button', { name: '남기기' }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText('내 답'), { target: { value: '근거와 함께' } });
    expect(send.disabled).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: '다르게 읽음' }));
    expect(send.disabled).toBe(false);
    fireEvent.click(send);
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(postAnswer).toHaveBeenCalledWith('d1', {
      underline: 2,
      stance: 'differ',
      body: '근거와 함께',
      evidenceEntryId: null,
    });
    expect(localStorage.getItem('debate-draft:d1:2')).toBeNull();
  });

  it('닫았다 다시 열어도 쓰던 답이 남는다', () => {
    const props = { debateId: 'd1', target: answerTarget, onDone: vi.fn(), onCancel: vi.fn() };
    const first = render(h(AnswerComposer, props));
    fireEvent.click(screen.getByRole('radio', { name: '공감' }));
    fireEvent.change(screen.getByLabelText('내 답'), { target: { value: '쓰던 답' } });
    first.unmount();
    render(h(AnswerComposer, props));
    expect((screen.getByLabelText('내 답') as HTMLTextAreaElement).value).toBe('쓰던 답');
    expect(screen.getByRole('radio', { name: '공감' }).getAttribute('aria-checked')).toBe('true');
  });

  it('답글에는 입장이 없다', async () => {
    render(
      h(AnswerComposer, {
        debateId: 'd1',
        target: { kind: 'reply', answerId: 'a1' },
        onDone: vi.fn(),
        onCancel: vi.fn(),
      })
    );
    expect(screen.queryByRole('radiogroup')).toBeNull();
    fireEvent.change(screen.getByLabelText('답글'), { target: { value: '그렇게 보면' } });
    fireEvent.click(screen.getByRole('button', { name: '남기기' }));
    await waitFor(() => expect(postReply).toHaveBeenCalledWith('a1', '그렇게 보면'));
  });

  it('실패하면 쓴 글을 두고 알린다', async () => {
    postAnswer.mockRejectedValue(new Error('정리된 토론이에요. 새 답은 남길 수 없어요.'));
    render(
      h(AnswerComposer, {
        debateId: 'd1',
        target: answerTarget,
        onDone: vi.fn(),
        onCancel: vi.fn(),
      })
    );
    fireEvent.click(screen.getByRole('radio', { name: '질문' }));
    fireEvent.change(screen.getByLabelText('내 답'), { target: { value: '남는 글' } });
    fireEvent.click(screen.getByRole('button', { name: '남기기' }));
    expect((await screen.findByRole('alert')).textContent).toContain('정리된 토론');
    expect((screen.getByLabelText('내 답') as HTMLTextAreaElement).value).toBe('남는 글');
  });
});
