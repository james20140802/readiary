// @vitest-environment jsdom
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExcerptBooklet from '@/components/books/ExcerptBooklet';
import MonthlyExcerptExport from '../MonthlyExcerptExport';
import { item, stubBrowser } from './fixtures';

stubBrowser(vi.stubGlobal);
afterEach(cleanup);

// 시트는 닫힌 상태에서 열릴 때 고르기 단계로 들어간다
const open = (items = [item(1)]) => {
  const el = (isOpen: boolean) =>
    h(MonthlyExcerptExport, { month: '2026-03', items, open: isOpen, onOpenChange: () => {} });
  render(el(false)).rerender(el(true));
};

describe('MonthlyExcerptExport', () => {
  it('비공개 문장이 있으면 내보내기 전에 알린다', () => {
    open([item(1), item(2, { isPrivate: true })]);
    expect(screen.getByText('비공개 문장이 포함돼요')).toBeTruthy();
  });
  it('비공개가 없으면 알리지 않는다', () => {
    open();
    expect(screen.queryByText('비공개 문장이 포함돼요')).toBeNull();
    expect(screen.getByRole('button', { name: /한 장으로/ })).toBeTruthy();
  });
});

describe('ExcerptBooklet', () => {
  const quotes = [{ id: 'a', date: '2026-03-02', quote: '문장' }];
  it('monthly가 없으면 책별 조판 그대로다', () => {
    const html = renderToStaticMarkup(
      h(ExcerptBooklet, { bookTitle: '책', author: '저자', quotes, entryDates: [] })
    );
    expect(html).toContain('『책』 — 저자');
    expect(html).not.toContain('달의 발췌집');
    expect(html).not.toContain('figcaption');
  });
  it('monthly면 표지에 달과 책, 문장에 책 이름이 찍힌다', () => {
    const html = renderToStaticMarkup(
      h(ExcerptBooklet, {
        bookTitle: '2026년 3월',
        author: null,
        quotes: [{ ...quotes[0], bookTitle: '아무튼, 메모' }],
        entryDates: [],
        monthly: { label: '2026년 3월', books: [{ title: '아무튼, 메모', count: 1 }] },
      })
    );
    expect(html).toContain('달의 발췌집');
    expect(html).toContain('달의 발췌집 — 2026년 3월');
    expect(html).toContain('<figcaption');
    expect(html).not.toContain('『');
  });
});
