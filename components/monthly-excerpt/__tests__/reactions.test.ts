// @vitest-environment jsdom
import { createElement as h, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommentBottomSheet from '@/components/comments/CommentBottomSheet';
import LikersBottomSheet from '@/components/social/LikersBottomSheet';
import SocialActionBar from '@/components/social/SocialActionBar';
import MonthlyExcerptReactions from '../MonthlyExcerptReactions';
import MonthlyExcerptReader from '../MonthlyExcerptReader';
import { item, stubBrowser } from './fixtures';

const apiFetch = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('@/lib/api/fetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  SessionExpiredError: class extends Error {},
}));
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'me' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  }),
}));

stubBrowser(vi.stubGlobal);
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const profile = { id: 'me', name: '민지', nickname: 'minji', tag: '0001' };
const comment = (over: object = {}) => ({
  id: 'c1',
  excerpt_id: 'x1',
  user_id: 'me',
  content: '좋은 달이네요',
  parent_id: null,
  created_at: '2026-04-01T00:00:00Z',
  profile,
  ...over,
});

beforeEach(() => {
  apiFetch.mockReset();
  sessionStorage.clear();
  refresh.mockReset();
});
afterEach(cleanup);

const reactions = (over: Partial<Parameters<typeof MonthlyExcerptReactions>[0]> = {}) =>
  render(
    h(MonthlyExcerptReactions, {
      excerptId: 'x1',
      month: '2026-03',
      currentUserId: 'me',
      initial: { likeCount: 2, commentCount: 1, liked: false },
      ...over,
    })
  );

describe('MonthlyExcerptReactions', () => {
  it('좋아요는 권의 경로로 보내고 수를 올린다', async () => {
    apiFetch.mockResolvedValue(ok({ liked: true }));
    reactions();
    fireEvent.click(screen.getByRole('button', { name: '좋아요 2개' }));
    expect(await screen.findByRole('button', { name: '좋아요 3개' })).toBeTruthy();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledOnce());
    const [url, init] = apiFetch.mock.calls[0];
    expect(url).toBe('/api/monthly-excerpts/x1/likes');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({});
  });

  it('실패하면 되돌린다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    apiFetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    reactions({ initial: { likeCount: 2, commentCount: 1, liked: true } });
    fireEvent.click(screen.getByRole('button', { name: '좋아요 2개' }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '좋아요 2개' }).getAttribute('aria-pressed')).toBe(
        'true'
      )
    );
  });

  it('좋아한 사람 명단은 권의 경로에서 읽는다', async () => {
    apiFetch.mockResolvedValue(ok([]));
    reactions();
    fireEvent.click(screen.getByRole('button', { name: '좋아요 2개, 좋아한 사람 보기' }));
    expect(await screen.findByText('아직 이 발췌집을 좋아한 사람이 없어요')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/api/monthly-excerpts/x1/likes');
  });

  it('댓글을 읽고, 남기고, 수를 맞춘다', async () => {
    apiFetch.mockImplementation(async (url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === 'POST')
        return ok(comment({ id: JSON.parse(init.body!).client_comment_id, content: '새 댓글' }));
      return ok([comment()]);
    });
    reactions();
    fireEvent.click(screen.getByRole('button', { name: '댓글 1개 보기' }));
    expect(await screen.findByText('좋은 달이네요')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/api/monthly-excerpts/x1/comments');

    const input = await screen.findByLabelText('댓글');
    await waitFor(() => expect((input as HTMLInputElement).disabled).toBe(false));
    fireEvent.change(input, { target: { value: '새 댓글' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '남기기' }));
    });
    expect(await screen.findByText('새 댓글')).toBeTruthy();
    const post = apiFetch.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(post[0]).toBe('/api/monthly-excerpts/x1/comments');
    const body = JSON.parse(post[1].body);
    expect(body).toMatchObject({ content: '새 댓글', parentId: null });
    expect(body).not.toHaveProperty('entryId');
    expect(body.client_comment_id).toBeTruthy();
    expect(screen.getByRole('button', { name: '댓글 2개 보기', hidden: true })).toBeTruthy();
  });

  it('숨겨진 동안 소유자에게 안내를 보인다', () => {
    reactions({ hidden: true });
    expect(screen.getByText('친구에게 보이지 않는 동안 새 반응을 받지 않아요')).toBeTruthy();
  });

  it('보이는 동안에는 안내가 없다', () => {
    reactions();
    expect(screen.queryByText('친구에게 보이지 않는 동안 새 반응을 받지 않아요')).toBeNull();
  });

  it('수를 불러오지 못하면 거짓 0을 그리지 않고 알린다', () => {
    reactions({ initial: null });
    expect(screen.getByRole('status').textContent).toContain('반응을 불러오지 못했어요');
    expect(screen.queryByRole('button', { name: /좋아요/ })).toBeNull();
  });
});

describe('뒤로 가기로 예전 화면 데이터가 돌아오지 않게', () => {
  it('좋아요가 저장되면 라우터가 기억해 둔 화면을 버린다', async () => {
    apiFetch.mockResolvedValue(ok({ liked: true }));
    reactions();
    fireEvent.click(screen.getByRole('button', { name: '좋아요 2개' }));
    await screen.findByRole('button', { name: '좋아요 3개' });
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it('좋아요가 실패하면 되돌리고 화면은 그대로 둔다', async () => {
    apiFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    reactions();
    fireEvent.click(screen.getByRole('button', { name: '좋아요 2개' }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledOnce());
    await screen.findByRole('button', { name: '좋아요 2개' });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('댓글 수가 바뀔 때만 화면을 버린다', async () => {
    apiFetch.mockResolvedValue(ok([comment()]));
    reactions();
    fireEvent.click(screen.getByRole('button', { name: /댓글/ }));
    await screen.findByText('좋은 달이네요');
    // 읽어 온 수(1)가 처음 수와 같으면 버리지 않는다
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('기록의 좋아요·댓글은 예전 그대로다', () => {
  it('SocialActionBar에 entryId를 주면 /api/likes로 보낸다', async () => {
    apiFetch.mockResolvedValue(ok({ liked: true }));
    render(h(SocialActionBar, { entryId: 'e1', initialLikeCount: 0, initialLiked: false }));
    fireEvent.click(screen.getByRole('button', { name: '좋아요 0개' }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledOnce());
    const [url, init] = apiFetch.mock.calls[0];
    expect(url).toBe('/api/likes');
    expect(JSON.parse(init.body)).toEqual({ entryId: 'e1' });
  });

  it('명단과 빈 문구', async () => {
    apiFetch.mockResolvedValue(ok([]));
    render(
      h(LikersBottomSheet, {
        target: { kind: 'entry', entryId: 'e1' },
        isOpen: true,
        onClose: () => {},
      })
    );
    expect(await screen.findByText('아직 이 기록을 좋아한 사람이 없어요')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/api/likes?entry_id=e1');
  });

  it('좋아한 사람을 못 불러오면 빈 명단 대신 실패와 다시 시도를 보인다', async () => {
    apiFetch.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    render(
      h(LikersBottomSheet, {
        target: { kind: 'entry', entryId: 'e1' },
        isOpen: true,
        onClose: () => {},
      })
    );
    expect(await screen.findByText('좋아한 사람을 불러오지 못했어요.')).toBeTruthy();
    expect(screen.queryByText('아직 이 기록을 좋아한 사람이 없어요')).toBeNull();

    apiFetch.mockResolvedValueOnce(ok([]));
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('아직 이 기록을 좋아한 사람이 없어요')).toBeTruthy();
    expect(screen.queryByText('좋아한 사람을 불러오지 못했어요.')).toBeNull();
  });

  it('댓글 시트: 읽기·지우기 주소와 작성 본문', async () => {
    apiFetch.mockImplementation(async (url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === 'POST')
        return ok(comment({ id: JSON.parse(init.body!).client_comment_id }));
      if (init?.method === 'DELETE') return ok({ success: true });
      return ok([comment()]);
    });
    render(
      h(CommentBottomSheet, {
        target: { kind: 'entry', entryId: 'e1' },
        currentUserId: 'me',
        isOpen: true,
        onClose: () => {},
      })
    );
    expect(await screen.findByText('좋은 달이네요')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/api/comments?entry_id=e1');

    const input = await screen.findByLabelText('댓글');
    await waitFor(() => expect((input as HTMLInputElement).disabled).toBe(false));
    fireEvent.change(input, { target: { value: '또' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '남기기' }));
    });
    const post = apiFetch.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(post[0]).toBe('/api/comments');
    expect(JSON.parse(post[1].body)).toMatchObject({
      entryId: 'e1',
      content: '또',
      parentId: null,
    });
  });
});

describe('Reader의 반응 자리', () => {
  const slot = h('div', { 'data-testid': 'slot' }, '반응');
  const read = (preview: boolean) =>
    render(
      h(MonthlyExcerptReader, {
        month: '2026-03',
        items: [item(1)],
        viewer: 'friend',
        preview,
        reactions: slot,
      })
    );

  it('읽는 화면에는 있고 미리보기에는 없다', () => {
    read(false);
    expect(screen.getByTestId('slot')).toBeTruthy();
    cleanup();
    read(true);
    expect(screen.queryByTestId('slot')).toBeNull();
  });

  it('펼치고 묶어도 다시 그리지 않아 누른 좋아요를 잃지 않는다', () => {
    function Counter() {
      const [n, setN] = useState(0);
      return h('button', { type: 'button', onClick: () => setN(n + 1) }, `센 수 ${n}`);
    }
    render(
      h(MonthlyExcerptReader, {
        month: '2026-03',
        items: [item(1)],
        viewer: 'friend',
        reactions: h(Counter),
      })
    );
    fireEvent.click(screen.getByRole('button', { name: '센 수 0' }));
    fireEvent.click(screen.getAllByRole('button', { name: '한 페이지로 펼치기' })[0]);
    expect(screen.getByRole('button', { name: '센 수 1' })).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: '다시 묶기' })[0]);
    expect(screen.getByRole('button', { name: '센 수 1' })).toBeTruthy();
  });
});
