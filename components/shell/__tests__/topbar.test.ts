// @vitest-environment jsdom
import { Fragment, createElement as h, useState, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TopBarActions,
  TopBarProvider,
  useTopBar,
  type TopBarConfig,
} from '@/components/shell/TopBarContext';
import { TopBar } from '@/components/shell/TopBar';
import { LargeTitle } from '@/components/shell/LargeTitle';

// 콜백을 테스트가 직접 호출하는 가짜 IntersectionObserver
const observers: FakeIO[] = [];
class FakeIO {
  disconnected = false;
  constructor(private cb: IntersectionObserverCallback) {
    observers.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
  trigger(entry: Partial<IntersectionObserverEntry>) {
    this.cb([entry as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}
const io = {
  trigger: (entry: Partial<IntersectionObserverEntry>) =>
    observers[observers.length - 1].trigger(entry),
};

function Configure(props: TopBarConfig) {
  useTopBar(props);
  return null;
}
function renderWithProvider(ui: ReactNode) {
  return render(h(TopBarProvider, null, ui));
}

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal('IntersectionObserver', FakeIO);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TopBar', () => {
  it('설정이 없으면 브랜드와 찾기·알림', () => {
    renderWithProvider(h(TopBar, { hasUnread: true }));
    expect(screen.getByText('Readiary')).toBeTruthy();
    expect(screen.getByRole('link', { name: '책과 기록 찾기' }).getAttribute('href')).toBe(
      '/search'
    );
    expect(screen.getByRole('link', { name: '알림, 새 소식 있음' }).getAttribute('href')).toBe(
      '/social/notifications'
    );
  });

  it('새 소식이 없으면 알림 이름에 새 소식 문구가 없다', () => {
    renderWithProvider(h(TopBar, { hasUnread: false }));
    expect(screen.getByRole('link', { name: '알림' })).toBeTruthy();
  });

  it('뒤로 링크와 제목을 화면이 정한다', () => {
    renderWithProvider(
      h(
        Fragment,
        null,
        h(Configure, { back: { href: '/today', label: '오늘' }, title: '찾기' }),
        h(TopBar, { hasUnread: false })
      )
    );
    expect(screen.getByRole('link', { name: '오늘' }).getAttribute('href')).toBe('/today');
    expect(screen.queryByText('Readiary')).toBeNull();
    expect(screen.getByText('찾기')).toBeTruthy();
  });

  it('화면이 사라지면 기본 설정으로 돌아간다', () => {
    const { rerender } = renderWithProvider(
      h(
        Fragment,
        null,
        h(Configure, { title: '찾기', brand: false }),
        h(TopBar, { hasUnread: false })
      )
    );
    expect(screen.queryByText('Readiary')).toBeNull();
    rerender(h(TopBarProvider, null, h(TopBar, { hasUnread: false })));
    expect(screen.getByText('Readiary')).toBeTruthy();
  });

  it('렌더마다 새 객체를 넘겨도 무한 갱신이 없다', () => {
    const rendered = vi.fn();
    function Counting() {
      rendered();
      useTopBar({ title: '찾기', back: { href: '/today', label: '오늘' } });
      return null;
    }
    renderWithProvider(h(Fragment, null, h(Counting), h(TopBar, { hasUnread: false })));
    expect(rendered.mock.calls.length).toBeLessThan(5);
  });

  it('화면이 넣은 버튼이 보이고 기본 찾기는 숨는다', () => {
    renderWithProvider(
      h(
        Fragment,
        null,
        h(TopBarActions, null, h('button', null, 'A')),
        h(TopBar, { hasUnread: false })
      )
    );
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.queryByRole('link', { name: '책과 기록 찾기' })).toBeNull();
  });

  it('같은 제목에서 버튼만 바뀌어도 최신이 보인다', () => {
    const page = (label: string) =>
      h(
        TopBarProvider,
        null,
        h(Configure, { title: 't' }),
        h(TopBarActions, null, h('button', null, label)),
        h(TopBar, { hasUnread: false })
      );
    const { rerender } = render(page('A'));
    rerender(page('B'));
    expect(screen.getByText('B')).toBeTruthy();
    expect(screen.queryByText('A')).toBeNull();
  });

  it('버튼의 onClick은 상태가 바뀐 뒤의 최신 클로저를 부른다', () => {
    const seen = vi.fn();
    function Page() {
      const [n, setN] = useState(0);
      return h(
        Fragment,
        null,
        h('button', { onClick: () => setN(n + 1) }, 'inc'),
        h(TopBarActions, null, h('button', { onClick: () => seen(n) }, 'act'))
      );
    }
    renderWithProvider(h(Fragment, null, h(Page), h(TopBar, { hasUnread: false })));
    fireEvent.click(screen.getByText('inc'));
    fireEvent.click(screen.getByText('act'));
    expect(seen).toHaveBeenCalledWith(1);
  });

  it('버튼이 사라지면 기본 찾기·알림이 돌아온다', () => {
    const { rerender } = renderWithProvider(
      h(
        Fragment,
        null,
        h(TopBarActions, null, h('button', null, 'A')),
        h(TopBar, { hasUnread: false })
      )
    );
    rerender(h(TopBarProvider, null, h(TopBar, { hasUnread: false })));
    expect(screen.getByRole('link', { name: '책과 기록 찾기' })).toBeTruthy();
  });

  it('앞 화면이 늦게 언마운트되어도 다음 화면의 제목을 지우지 않는다', () => {
    const { rerender } = render(
      h(
        TopBarProvider,
        null,
        h(Configure, { key: 'a', title: 'A' }),
        h(TopBar, { hasUnread: false })
      )
    );
    // 다음 화면 B가 먼저 마운트되고 A가 뒤에 빠진다
    rerender(
      h(
        TopBarProvider,
        null,
        h(Configure, { key: 'a', title: 'A' }),
        h(Configure, { key: 'b', title: 'B' }),
        h(TopBar, { hasUnread: false })
      )
    );
    rerender(
      h(
        TopBarProvider,
        null,
        h(Configure, { key: 'b', title: 'B' }),
        h(TopBar, { hasUnread: false })
      )
    );
    expect(screen.getByText('B')).toBeTruthy();
  });

  it('큰 제목이 가려지면 바가 간지 재질로 바뀐다', () => {
    renderWithProvider(
      h(Fragment, null, h(LargeTitle, null, '찾기'), h(TopBar, { hasUnread: false }))
    );
    expect(document.querySelector('.topbar--scrolled')).toBeNull();
    act(() => io.trigger({ isIntersecting: false }));
    expect(document.querySelector('.topbar--scrolled')).not.toBeNull();
    act(() => io.trigger({ isIntersecting: true }));
    expect(document.querySelector('.topbar--scrolled')).toBeNull();
  });

  it('큰 제목이 사라지면 재질이 풀리고 감시를 끝낸다', () => {
    const { rerender } = renderWithProvider(
      h(Fragment, null, h(LargeTitle, null, '찾기'), h(TopBar, { hasUnread: false }))
    );
    act(() => io.trigger({ isIntersecting: false }));
    rerender(h(TopBarProvider, null, h(TopBar, { hasUnread: false })));
    expect(document.querySelector('.topbar--scrolled')).toBeNull();
    expect(observers[0].disconnected).toBe(true);
  });

  it('큰 제목은 h1로 나온다', () => {
    renderWithProvider(
      h(Fragment, null, h(LargeTitle, null, '찾기'), h(TopBar, { hasUnread: false }))
    );
    expect(screen.getByRole('heading', { level: 1, name: '찾기' })).toBeTruthy();
  });
});

describe('TopBar 창 스크롤 대체 감지', () => {
  let frames: FrameRequestCallback[] = [];
  function scrollTo(y: number) {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
    act(() => {
      fireEvent.scroll(window);
      const run = frames;
      frames = [];
      run.forEach((cb) => cb(0));
    });
  }
  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('큰 제목이 없으면 창이 스크롤될 때 바가 간지 재질로 바뀐다', () => {
    renderWithProvider(h(TopBar, { hasUnread: false }));
    expect(document.querySelector('.topbar--scrolled')).toBeNull();
    scrollTo(10);
    expect(document.querySelector('.topbar--scrolled')).not.toBeNull();
    scrollTo(0);
    expect(document.querySelector('.topbar--scrolled')).toBeNull();
  });

  it('큰 제목이 있으면 스크롤 이벤트가 표식의 판단을 덮지 않는다', () => {
    renderWithProvider(
      h(Fragment, null, h(LargeTitle, null, '찾기'), h(TopBar, { hasUnread: false }))
    );
    scrollTo(10);
    expect(document.querySelector('.topbar--scrolled')).toBeNull();
    act(() => io.trigger({ isIntersecting: false }));
    scrollTo(0);
    expect(document.querySelector('.topbar--scrolled')).not.toBeNull();
  });
});
