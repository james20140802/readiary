// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBarProvider } from '@/components/shell/TopBarContext';
import NewDebateFlow from '../NewDebateFlow';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));
const createDebate = vi.fn();
vi.mock('@/lib/debate/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/debate/client')>()),
  createDebate: (input: unknown) => createDebate(input),
}));

const entry = {
  id: '10000000-0000-4000-8000-000000000101',
  quote: '경계와 문턱이 사라짐과 동시에',
  bookTitle: '에로스의 종말',
  bookAuthor: '한병철',
  isPrivate: false,
};

const renderFlow = (initialEntry: typeof entry | null = entry) =>
  render(h(TopBarProvider, null, h(NewDebateFlow, { initialEntry })));

beforeEach(() => {
  replace.mockReset();
  createDebate.mockReset();
});
afterEach(cleanup);

describe('NewDebateFlow', () => {
  it('질문 칸은 크기 조절 손잡이 없이 글 길이만큼 늘어난다', () => {
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    const area = screen.getByLabelText('질문') as HTMLTextAreaElement;
    expect(area.className).toContain('resize-none');
    Object.defineProperty(area, 'scrollHeight', { configurable: true, value: 180 });
    fireEvent.change(area, { target: { value: '한 줄\n두 줄\n세 줄\n네 줄' } });
    expect(area.style.height).toBe('180px');
  });

  it('기록을 가지고 오면 밑줄 단계부터', () => {
    renderFlow();
    expect(screen.getByText('발제 2/3')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '함께 볼 곳에 밑줄을 그어요' })).toBeTruthy();
  });

  it('기록 없이 오면 기록 고르기부터', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ items: [], next: null })))
    );
    renderFlow(null);
    expect(screen.getByText('발제 1/3')).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it('질문이 비면 올리기를 못 하고, 올리면 그은 밑줄과 함께 보낸 뒤 토론으로 간다', async () => {
    createDebate.mockResolvedValue({ id: 'd1' });
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('발제 3/3')).toBeTruthy();
    expect(screen.getByText('이 문장은 기록과 따로 토론에 남아요')).toBeTruthy();
    const submit = screen.getByRole('button', { name: '올리기' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('질문'), { target: { value: '가까워질수록?' } });
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/social/talk/d1'));
    expect(createDebate).toHaveBeenCalledWith({
      entryId: entry.id,
      question: '가까워질수록?',
      underlines: [],
    });
  });

  it('실패하면 쓴 질문을 그대로 두고 알린다', async () => {
    createDebate.mockRejectedValue(new Error('문장이 있는 기록만 토론을 열 수 있어요.'));
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.change(screen.getByLabelText('질문'), { target: { value: '남는 질문' } });
    fireEvent.click(screen.getByRole('button', { name: '올리기' }));
    expect((await screen.findByRole('alert')).textContent).toContain('문장이 있는 기록만');
    expect((screen.getByLabelText('질문') as HTMLTextAreaElement).value).toBe('남는 질문');
    expect(replace).not.toHaveBeenCalled();
  });

  it('이전으로 돌아가도 쓴 질문이 남는다', () => {
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.change(screen.getByLabelText('질문'), { target: { value: '남아라' } });
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect((screen.getByLabelText('질문') as HTMLTextAreaElement).value).toBe('남아라');
  });
});
