// @vitest-environment jsdom
import { createElement as h, useState, Suspense } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import TodayView from '../TodayView';
import { TopBarProvider } from '@/components/shell/TopBarContext';

let desktop = false;
const listeners = new Set<() => void>();
function resize(value: boolean) {
  act(() => {
    desktop = value;
    listeners.forEach((notify) => notify());
  });
}
function ComposerProbe() {
  const [value, setValue] = useState('');
  return h('textarea', {
    'aria-label': '덧붙일 생각',
    value,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value),
  });
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  listeners.clear();
});
it('모바일과 데스크톱 사이를 왕복해도 작성 중인 생각과 같은 입력 노드를 유지한다', async () => {
  desktop = false;
  vi.stubGlobal('matchMedia', () => ({
    matches: desktop,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  const recall = Promise.resolve(null);
  await act(async () => {
    render(
      h(
        TopBarProvider,
        null,
        h(
          Suspense,
          { fallback: null },
          h(TodayView, {
            todayKst: '2026-10-06',
            weeklyCount: 0,
            weekActivity: [],
            books: [],
            latestTexts: {},
            recentUserBookId: null,
            recentEntries: [],
            recall,
            composer: h(ComposerProbe),
            markSeen: false,
          })
        )
      )
    );
  });
  const input = screen.getByRole('textbox', { name: '덧붙일 생각' });
  fireEvent.change(input, { target: { value: '아직 남기지 않은 생각' } });
  resize(true);
  expect(screen.getByRole('textbox')).toBe(input);
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('아직 남기지 않은 생각');
  resize(false);
  expect(screen.getByRole('textbox')).toBe(input);
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('아직 남기지 않은 생각');
});
