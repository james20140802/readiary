// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubBrowser } from '@/components/monthly-excerpt/__tests__/fixtures';
import type { OwnSentences } from '@/lib/monthly-sentence/types';
import { months, own, ownRow, res } from './fixtures';

stubBrowser(vi.stubGlobal);

const refresh = vi.fn();
const apiFetch = vi.fn();
const toastError = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) =>
    h('a', { href, ...rest }, children as never),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: (m: string) => toastError(m) } }));
vi.mock('@/lib/api/fetch', () => ({
  apiFetch: (...a: unknown[]) => apiFetch(...a),
  SessionExpiredError: class extends Error {},
}));

const { default: MySentences } = await import('../MySentences');

const show = (initial: OwnSentences | null) => render(h(MySentences, { initial }));
const rows = () => screen.getAllByRole('listitem');
const calls = () => apiFetch.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`);

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('MySentences — 상태', () => {
  it('불러오지 못했으면 실패 문구', () => {
    show(null);
    expect(
      screen.getByText('달마다 남긴 문장을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.')
    ).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('기록이 없으면 첫 문장을 남기라는 빈 상태', () => {
    show(own({ rows: [] }));
    expect(screen.getByText(/첫 문장을 남기면 이 일기장의 첫 장이 생겨요/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '오늘 남기기' }).getAttribute('href')).toBe('/today');
  });

  it('줄마다 문장, 메타, 바꾸기를 보인다', () => {
    show(
      own({
        rows: [
          ownRow('2026-11', { source: 'picked', fromPage: 184, entryCount: 12 }),
          ownRow('2026-10', {
            entryId: null,
            quote: null,
            bookTitle: null,
            source: null,
            entryCount: 0,
          }),
        ],
      })
    );
    expect(screen.getByRole('link', { name: '2026-11의 문장' }).getAttribute('href')).toBe(
      '/entry/e-2026-11'
    );
    expect(screen.getByText('아무튼, 메모 · p.184 · 내가 고른 문장 · 기록 12')).toBeTruthy();
    expect(screen.getByRole('button', { name: '2026년 11월 문장 바꾸기' })).toBeTruthy();
    expect(screen.getByText('쉬어 간 달')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '2026년 10월 문장 바꾸기' })).toBeNull();
  });

  it('나만 보기 문장을 고른 달에 안내를 붙인다', () => {
    show(
      own({
        rows: [ownRow('2026-11', { source: 'picked', isPrivate: true, friendFallback: 'none' })],
      })
    );
    expect(screen.getByText('나만 보여요 · 친구에게는 이 달이 보이지 않아요')).toBeTruthy();
  });

  it('끝난 달은 엮기, 엮은 달은 펼치기로 이어진다', () => {
    show(
      own({
        rows: [ownRow('2026-10', { excerpt: 'unmade' }), ownRow('2026-09', { excerpt: 'made' })],
      })
    );
    expect(screen.getByRole('link', { name: '2026년 10월 엮기' }).getAttribute('href')).toBe(
      '/excerpts/2026-10/compose'
    );
    expect(screen.getByRole('link', { name: '2026년 9월 펼치기' }).getAttribute('href')).toBe(
      '/excerpts/2026-09'
    );
  });

  it('새 initial이 오면 그 값으로 다시 맞춘다', () => {
    const { rerender } = show(own({ rows: [ownRow('2026-11', { quote: '옛 문장' })] }));
    rerender(h(MySentences, { initial: own({ rows: [ownRow('2026-11', { quote: '새 문장' })] }) }));
    expect(screen.getByRole('link', { name: '새 문장' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: '옛 문장' })).toBeNull();
  });
});

describe('MySentences — 자동 기준', () => {
  const openRules = () => fireEvent.click(screen.getByRole('button', { name: /고르지 않은 달은/ }));

  it('지금 기준을 문장으로 보이고, 누르면 선택지가 열린다', () => {
    show(own({ rule: 'likes' }));
    expect(
      screen.getByRole('button', { name: /고르지 않은 달은 좋아요 많은 문장으로/ })
    ).toBeTruthy();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    openRules();
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.textContent)).toEqual([
      '좋아요 많은 문장',
      '생각 많은 문장',
      '최근 문장',
    ]);
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
  });

  it('이어 남긴 생각이 꺼져 있으면 그 선택지가 없고, 저장된 값은 최근으로 보인다', () => {
    show(own({ rule: 'reflections', reflectionsOn: false }));
    expect(screen.getByRole('button', { name: /고르지 않은 달은 최근 문장으로/ })).toBeTruthy();
    openRules();
    expect(screen.queryByRole('radio', { name: '생각 많은 문장' })).toBeNull();
  });

  it('고르면 저장하고, 펼쳐 둔 만큼 다시 받아 바꾼다', async () => {
    apiFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return res({ rule: 'recent' });
      return res(own({ rule: 'recent', rows: [ownRow('2026-11', { quote: '최근의 문장' })] }));
    });
    show(own());
    openRules();
    fireEvent.click(screen.getByRole('radio', { name: '최근 문장' }));
    await waitFor(() => expect(screen.getByRole('link', { name: '최근의 문장' })).toBeTruthy());
    expect(calls()).toEqual(['PUT /api/monthly-sentences/rule', 'GET /api/monthly-sentences']);
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({ rule: 'recent' });
    expect(screen.getByRole('button', { name: /고르지 않은 달은 최근 문장으로/ })).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });

  it('저장하는 동안 선택지를 잠근다', async () => {
    let finish: (r: Response) => void = () => {};
    apiFetch.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === 'PUT'
        ? new Promise<Response>((r) => (finish = r))
        : Promise.resolve(res(own()))
    );
    show(own());
    openRules();
    fireEvent.click(screen.getByRole('radio', { name: '최근 문장' }));
    await waitFor(() =>
      expect(
        (screen.getByRole('radio', { name: '좋아요 많은 문장' }) as HTMLButtonElement).disabled
      ).toBe(true)
    );
    fireEvent.click(screen.getByRole('radio', { name: '좋아요 많은 문장' }));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    finish(res({ rule: 'recent' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('저장하지 못하면 이전 기준으로 돌아가고 알린다', async () => {
    apiFetch.mockResolvedValue(res({ error: 'x' }, false));
    show(own({ rule: 'likes' }));
    openRules();
    fireEvent.click(screen.getByRole('radio', { name: '최근 문장' }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('기준을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.')
    );
    expect(
      screen.getByRole('button', { name: /고르지 않은 달은 좋아요 많은 문장으로/ })
    ).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('MySentences — 더 보기', () => {
  it('더 없으면 버튼이 없다', () => {
    show(own({ nextBefore: null }));
    expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull();
  });

  it('누르면 다음 여섯 줄을 붙인다', async () => {
    apiFetch.mockResolvedValue(
      res(own({ rows: months(6, 5).map((m) => ownRow(m)), nextBefore: null }))
    );
    show(own({ nextBefore: '2026-06' }));
    fireEvent.click(screen.getByRole('button', { name: '더 보기' }));
    await waitFor(() => expect(rows()).toHaveLength(12));
    expect(calls()).toEqual(['GET /api/monthly-sentences?before=2026-06']);
    expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull();
  });

  it('불러오지 못하면 다시 시도할 수 있다', async () => {
    apiFetch.mockResolvedValueOnce(res({ error: 'x' }, false));
    show(own({ nextBefore: '2026-06' }));
    fireEvent.click(screen.getByRole('button', { name: '더 보기' }));
    await waitFor(() => expect(screen.getByText('문장을 불러오지 못했어요.')).toBeTruthy());
    expect(rows()).toHaveLength(6);
    apiFetch.mockResolvedValueOnce(
      res(own({ rows: months(2, 5).map((m) => ownRow(m)), nextBefore: null }))
    );
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(rows()).toHaveLength(8));
  });
});

describe('MySentences — 바꾸기', () => {
  it('바꾸기를 눌러야 후보를 불러오고, 고르면 그 줄이 바뀐다', async () => {
    show(own());
    expect(apiFetch).not.toHaveBeenCalled();
    apiFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        return res({
          row: ownRow('2026-11', { entryId: 'c2', quote: '고른 문장', source: 'picked' }),
        });
      }
      return res({
        pickedEntryId: null,
        publicCount: 2,
        total: 2,
        hasMore: false,
        items: [
          {
            entryId: 'c1',
            quote: '후보 하나',
            bookTitle: '책',
            date: '2026-11-09',
            isPrivate: false,
          },
          {
            entryId: 'c2',
            quote: '후보 둘',
            bookTitle: '책',
            date: '2026-11-02',
            isPrivate: false,
          },
        ],
      });
    });
    fireEvent.click(screen.getByRole('button', { name: '2026년 11월 문장 바꾸기' }));
    fireEvent.click(await screen.findByRole('radio', { name: /후보 둘/ }));
    // 시트가 닫히는 움직임이 끝나기 전에는 배경이 보조기기에서 가려져 있어 글자로 찾는다
    await waitFor(() => expect(screen.getByText('고른 문장')).toBeTruthy());
    expect(screen.getByText(/내가 고른 문장/)).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });
});
