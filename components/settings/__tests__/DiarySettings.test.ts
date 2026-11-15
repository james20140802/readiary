// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { res } from '@/components/monthly-sentence/__tests__/fixtures';
import type { SentenceRuleSetting } from '@/lib/monthly-sentence/types';

const refresh = vi.fn();
const apiFetch = vi.fn();
const toastError = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: (m: string) => toastError(m) } }));
vi.mock('@/lib/api/fetch', () => ({
  apiFetch: (...a: unknown[]) => apiFetch(...a),
  SessionExpiredError: class extends Error {},
}));

const { default: DiarySettings } = await import('../DiarySettings');

const show = (initial: SentenceRuleSetting | null) => render(h(DiarySettings, { initial }));
const radio = (name: string) => screen.getByRole('radio', { name }) as HTMLButtonElement;

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('DiarySettings — 고르지 않은 달을 채우는 기준', () => {
  it('세 기준을 보이고 지금 기준이 골라져 있다', () => {
    show({ rule: 'likes', reflectionsOn: true });
    expect(screen.getByRole('heading', { name: '일기장' })).toBeTruthy();
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.textContent)).toEqual([
      '좋아요 많은 문장',
      '생각 많은 문장',
      '최근 문장',
    ]);
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
  });

  it('이어 남긴 생각이 꺼져 있으면 그 선택지가 없고, 저장된 값은 최근으로 보인다', () => {
    show({ rule: 'reflections', reflectionsOn: false });
    expect(screen.queryByRole('radio', { name: '생각 많은 문장' })).toBeNull();
    expect(radio('최근 문장').getAttribute('aria-checked')).toBe('true');
  });

  it('불러오지 못했으면 선택지 대신 실패 문구', () => {
    show(null);
    expect(screen.getByText(/기준을 불러오지 못했어요/)).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('고르면 저장하고 그 기준이 골라진다', async () => {
    apiFetch.mockResolvedValue(res({ rule: 'recent' }));
    show({ rule: 'likes', reflectionsOn: true });
    fireEvent.click(radio('최근 문장'));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch.mock.calls[0][0]).toBe('/api/monthly-sentences/rule');
    expect(apiFetch.mock.calls[0][1].method).toBe('PUT');
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({ rule: 'recent' });
    expect(radio('최근 문장').getAttribute('aria-checked')).toBe('true');
    expect(radio('최근 문장').disabled).toBe(false);
  });

  it('지금 기준을 다시 누르면 저장하지 않는다', () => {
    show({ rule: 'likes', reflectionsOn: true });
    fireEvent.click(radio('좋아요 많은 문장'));
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('저장하는 동안 선택지를 잠근다', async () => {
    let finish: (r: Response) => void = () => {};
    apiFetch.mockImplementation(() => new Promise<Response>((r) => (finish = r)));
    show({ rule: 'likes', reflectionsOn: true });
    fireEvent.click(radio('최근 문장'));
    await waitFor(() => expect(radio('생각 많은 문장').disabled).toBe(true));
    fireEvent.click(radio('생각 많은 문장'));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    finish(res({ rule: 'recent' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('저장하지 못하면 이전 기준으로 돌아가고 알린다', async () => {
    apiFetch.mockResolvedValue(res({ error: 'x' }, false));
    show({ rule: 'likes', reflectionsOn: true });
    fireEvent.click(radio('최근 문장'));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('기준을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.')
    );
    expect(radio('좋아요 많은 문장').getAttribute('aria-checked')).toBe('true');
    expect(refresh).not.toHaveBeenCalled();
  });
});
