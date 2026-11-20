// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement as el, type ReactNode } from 'react';
import AnswerComposer from '../AnswerComposer';
import { DebateViewerProvider } from '../viewer';

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

// 토론 화면은 지금 계정을 알려 준다 — 초안은 그 계정의 것만 읽고 쓴다
const as = (viewerId: string | null) => ({
  wrapper: ({ children }: { children: ReactNode }) =>
    el(DebateViewerProvider, { viewerId, children }),
});
const me = as('u1');

const answerTarget = { kind: 'answer' as const, position: 2, label: '타자에 대한 환상' };

describe('AnswerComposer', () => {
  it('답·답글·고치기 칸은 손잡이 없이 쓴 만큼 늘어난다', () => {
    render(
      h(AnswerComposer, {
        debateId: 'd1',
        target: answerTarget,
        onDone: vi.fn(),
        onCancel: vi.fn(),
      }),
      me
    );
    const area = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(area.className).toContain('resize-none');
    Object.defineProperty(area, 'scrollHeight', { configurable: true, value: 240 });
    fireEvent.change(area, { target: { value: '길게\n\n\n\n\n쓴 답' } });
    expect(area.style.height).toBe('240px');
  });

  it('입장과 글이 모두 있어야 남길 수 있다', async () => {
    const onDone = vi.fn();
    render(
      h(AnswerComposer, { debateId: 'd1', target: answerTarget, onDone, onCancel: vi.fn() }),
      me
    );
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
    expect(localStorage.getItem('debate-draft:v2:u1:d1:2')).toBeNull();
  });

  it('밑줄에 물음이 있으면 입장 위에 보인다', () => {
    render(
      h(AnswerComposer, {
        debateId: 'd1',
        target: { ...answerTarget, prompt: '환상이 사라지면 무엇이 남을까요?' },
        onDone: vi.fn(),
        onCancel: vi.fn(),
      }),
      me
    );
    expect(screen.getByText('환상이 사라지면 무엇이 남을까요?')).toBeTruthy();
  });

  it('닫았다 다시 열어도 쓰던 답이 남는다', () => {
    const props = { debateId: 'd1', target: answerTarget, onDone: vi.fn(), onCancel: vi.fn() };
    const first = render(h(AnswerComposer, props), me);
    fireEvent.click(screen.getByRole('radio', { name: '공감' }));
    fireEvent.change(screen.getByLabelText('내 답'), { target: { value: '쓰던 답' } });
    first.unmount();
    render(h(AnswerComposer, props), me);
    expect((screen.getByLabelText('내 답') as HTMLTextAreaElement).value).toBe('쓰던 답');
    expect(screen.getByRole('radio', { name: '공감' }).getAttribute('aria-checked')).toBe('true');
  });

  it('같은 기기의 다른 계정에는 쓰던 답이 넘어가지 않는다', () => {
    const props = { debateId: 'd1', target: answerTarget, onDone: vi.fn(), onCancel: vi.fn() };
    const a = render(h(AnswerComposer, props), as('a'));
    fireEvent.change(screen.getByLabelText('내 답'), { target: { value: 'A가 쓰던 답' } });
    a.unmount();
    render(h(AnswerComposer, props), as('b'));
    expect((screen.getByLabelText('내 답') as HTMLTextAreaElement).value).toBe('');
  });

  it('계정을 모르면 초안을 이 기기에 남기지 않는다', () => {
    render(
      h(AnswerComposer, {
        debateId: 'd1',
        target: answerTarget,
        onDone: vi.fn(),
        onCancel: vi.fn(),
      }),
      as(null)
    );
    fireEvent.change(screen.getByLabelText('내 답'), { target: { value: '쓰던 답' } });
    expect(Object.keys(localStorage).filter((k) => k.startsWith('debate-draft:'))).toEqual([]);
  });

  it('답글에는 입장이 없다', async () => {
    render(
      h(AnswerComposer, {
        debateId: 'd1',
        target: { kind: 'reply', answerId: 'a1' },
        onDone: vi.fn(),
        onCancel: vi.fn(),
      }),
      me
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
      }),
      me
    );
    fireEvent.click(screen.getByRole('radio', { name: '질문' }));
    fireEvent.change(screen.getByLabelText('내 답'), { target: { value: '남는 글' } });
    fireEvent.click(screen.getByRole('button', { name: '남기기' }));
    expect((await screen.findByRole('alert')).textContent).toContain('정리된 토론');
    expect((screen.getByLabelText('내 답') as HTMLTextAreaElement).value).toBe('남는 글');
  });
});
