// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MonthlyExcerptReader from '../MonthlyExcerptReader';
import { item, stubBrowser } from './fixtures';

stubBrowser(vi.stubGlobal);
afterEach(cleanup);

const read = (props: Partial<Parameters<typeof MonthlyExcerptReader>[0]> = {}) =>
  render(
    h(MonthlyExcerptReader, {
      month: '2026-03',
      items: [item(1), item(2)],
      viewer: 'owner',
      ...props,
    })
  );

describe('MonthlyExcerptReader', () => {
  it('폰트 교체로 넘치게 되면 다시 재서 키보드로 스크롤할 수 있게 한다', async () => {
    let fontsReady = () => {};
    const ready = new Promise<void>((resolve) => (fontsReady = resolve));
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } });
    const scrollHeight = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(0);
    try {
      read({ items: [item(1)] });
      expect(screen.queryAllByRole('group', { name: '문장 전체, 위아래로 스크롤' })).toEqual([]);
      scrollHeight.mockReturnValue(500);
      fontsReady();
      const bodies = await screen.findAllByRole('group', { name: '문장 전체, 위아래로 스크롤' });
      expect(bodies.some((el) => el.tabIndex === 0)).toBe(true);
    } finally {
      scrollHeight.mockRestore();
      Reflect.deleteProperty(document, 'fonts');
    }
  });

  it('표제지: 달, 문장, 책별 수, 많으면 외 N권', () => {
    const books = ['가', '나', '다', '라'].map((t, i) => ({ id: t, title: t, author: null, i }));
    read({
      items: [
        item(1, { book: books[0] }),
        item(2, { book: books[0] }),
        item(3, { book: books[1] }),
        item(4, { book: books[2] }),
        item(5, { book: books[3] }),
      ],
    });
    expect(screen.getByRole('heading', { name: '2026년 3월' })).toBeTruthy();
    expect(screen.getByText('네 권의 책에서 문장 다섯 개를 골랐습니다.')).toBeTruthy();
    expect(screen.getByText('외 2권')).toBeTruthy();
  });

  it('장에 책 이름, 쪽, 날짜, 생각이 있다', () => {
    read({ items: [item(1, { note: '내 생각', fromPage: 88, toPage: 92 })] });
    expect(screen.getAllByText('아무튼, 메모').length).toBeGreaterThan(0);
    expect(screen.getByText('p.88–92')).toBeTruthy();
    expect(screen.getByText('3월 14일')).toBeTruthy();
    expect(screen.getByText('내 생각')).toBeTruthy();
  });

  it('쪽이 없어도 날짜는 보인다', () => {
    read({ items: [item(1, { fromPage: null })] });
    expect(screen.queryByText(/^p\./)).toBeNull();
    expect(screen.getByText('3월 14일')).toBeTruthy();
  });

  it('비공개 표시는 내 화면에서만', () => {
    const items = [item(1, { isPrivate: true })];
    read({ items });
    expect(screen.getByText('비공개')).toBeTruthy();
    cleanup();
    read({ items, viewer: 'friend' });
    expect(screen.queryByText('비공개')).toBeNull();
  });

  it('펼치면 조각이 고른 순서대로 놓이고, 초점은 다시 묶기에, 다시 묶을 수 있다', () => {
    read({ items: [item(1), item(2), item(3)] });
    fireEvent.click(screen.getByRole('button', { name: '한 페이지로 펼치기' }));
    const list = screen.getByRole('list', { name: '오려 붙인 문장' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.querySelector('p')?.textContent)
    ).toEqual(['문장 1', '문장 2', '문장 3']);
    const again = screen.getAllByRole('button', { name: '다시 묶기' });
    expect(document.activeElement).toBe(again[0]);
    fireEvent.click(again[0]);
    expect(screen.queryByRole('list', { name: '오려 붙인 문장' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '한 페이지로 펼치기' }));
  });

  it('펼친 조각의 기울기는 안쪽 간지에, 넓힌 상자는 기울지 않는다(WebKit 규칙)', () => {
    read();
    fireEvent.click(screen.getByRole('button', { name: '한 페이지로 펼치기' }));
    const li = within(screen.getByRole('list', { name: '오려 붙인 문장' })).getAllByRole(
      'listitem'
    )[0];
    expect(li.style.getPropertyValue('--paste-tilt')).toBe('');
    const slip = li.firstElementChild as HTMLElement;
    expect(slip.className).toContain('vellum-slip');
    expect(slip.style.getPropertyValue('--paste-tilt')).toBe('-0.5deg');
  });

  it('다음 장으로 넘기고, 한 장뿐이면 다음 장이 없다', () => {
    read();
    expect(screen.getByText('1/2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다음 장' }));
    expect(screen.getByText('2/2')).toBeTruthy();
    cleanup();
    read({ items: [item(1)] });
    expect(screen.queryByRole('button', { name: '다음 장' })).toBeNull();
  });

  it('actions는 그리고, 미리보기에서는 그리지 않는다', () => {
    const actions = h('button', null, '동작');
    read({ actions });
    expect(screen.getByRole('button', { name: '동작' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '한 페이지로 펼치기' }));
    expect(screen.getByRole('button', { name: '동작' })).toBeTruthy();
    cleanup();
    read({ actions, preview: true });
    expect(screen.queryByRole('button', { name: '동작' })).toBeNull();
    expect(screen.getByRole('button', { name: '한 페이지로 펼치기' })).toBeTruthy();
  });

  it('내용이 넘치는 장만 키보드로 잡혀 스크롤할 수 있다', () => {
    const spy = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(900);
    const client = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300);
    read({ items: [item(1)] });
    const scroller = screen.getByRole('group', { name: '문장 전체, 위아래로 스크롤' });
    expect(scroller.getAttribute('tabindex')).toBe('0');
    cleanup();
    spy.mockReturnValue(300);
    read({ items: [item(1)] });
    expect(screen.queryByRole('group', { name: '문장 전체, 위아래로 스크롤' })).toBeNull();
    spy.mockRestore();
    client.mockRestore();
  });

  it('제목이 같은 다른 책이 있어도 키가 겹치지 않는다', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    read({
      items: [
        item(1, { book: { id: 'a', title: '같은 제목', author: null } }),
        item(2, { book: { id: 'b', title: '같은 제목', author: null } }),
      ],
    });
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('항목이 없어도 깨지지 않는다', () => {
    read({ items: [] });
    expect(screen.getByText('담긴 문장이 없어요.')).toBeTruthy();
  });
});
