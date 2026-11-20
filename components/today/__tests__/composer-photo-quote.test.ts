// @vitest-environment jsdom
import { createElement as h, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ComposerView, { type ComposerMode, type ComposerViewProps } from '../ComposerView';

vi.mock('@/components/photo-quote/PhotoQuoteButton', () => ({
  default: ({ onText, disabled }: { onText(text: string): void; disabled?: boolean }) =>
    h('button', { type: 'button', disabled, onClick: () => onText('새 문장') }, '사진으로 옮기기'),
}));
vi.mock('../BookPickSheet', () => ({ default: () => null }));
vi.mock('../PagesSheet', () => ({ default: () => null }));
afterEach(cleanup);

const noop = () => {};
/** Composer처럼 값을 쥐고 ComposerView에 내려 준다 */
function Harness({
  mode,
  quote: q0 = '',
  note: n0 = '',
  spy,
  disabled = false,
}: {
  mode: ComposerMode;
  quote?: string;
  note?: string;
  spy: (f: ComposerMode, v: string) => void;
  disabled?: boolean;
}) {
  const [quote, setQuote] = useState(q0);
  const [note, setNote] = useState(n0);
  const props: ComposerViewProps = {
    desk: false,
    books: [],
    selectedId: null,
    mode,
    quote,
    note,
    isPrivate: false,
    ready: true,
    disabled,
    canSave: false,
    pendingSubmission: false,
    submitting: false,
    draftKept: false,
    storageError: false,
    saveError: null,
    saved: null,
    onChange: (field, value) => {
      spy(field, value);
      (field === 'quote' ? setQuote : setNote)(value);
    },
    onMode: noop,
    onTogglePrivate: noop,
    onSelectBook: noop,
    onSave: noop,
    onExtraOpen: noop,
    onExtraChange: noop,
    onAddExtra: noop,
    onAddPages: () => true,
    onAgain: noop,
  };
  return h(ComposerView, props);
}

it('문장을 쓰는 중이면 고른 글이 주 칸에 붙고 커서가 끝에 놓인다', async () => {
  const spy = vi.fn();
  render(h(Harness, { mode: 'quote', quote: '쓰던 글', spy }));
  fireEvent.click(screen.getByRole('button', { name: '사진으로 옮기기' }));
  expect(spy).toHaveBeenCalledWith('quote', '쓰던 글\n\n새 문장');
  const field = screen.getByLabelText('오늘 마음에 남은 문장') as HTMLTextAreaElement;
  expect(field.value).toBe('쓰던 글\n\n새 문장');
  await vi.waitFor(() => expect(document.activeElement).toBe(field));
});

it('문장을 쓰는 중이면 생각 칸은 저절로 열리지 않는다', () => {
  render(h(Harness, { mode: 'quote', spy: vi.fn() }));
  fireEvent.click(screen.getByRole('button', { name: '사진으로 옮기기' }));
  expect(screen.queryByLabelText('나의 생각')).toBeNull();
  expect(screen.getByRole('button', { name: '생각 덧붙이기' })).toBeTruthy();
});

it('생각을 쓰는 중이어도 문장 칸이 열려 고른 글이 들어가고 생각은 그대로다', async () => {
  const spy = vi.fn();
  render(h(Harness, { mode: 'note', note: '내 생각', spy }));
  expect(screen.queryByLabelText('책의 문장')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '사진으로 옮기기' }));
  expect(spy).toHaveBeenCalledWith('quote', '새 문장');
  expect(spy).toHaveBeenCalledTimes(1);
  const field = screen.getByLabelText('책의 문장') as HTMLTextAreaElement;
  expect(field.value).toBe('새 문장');
  expect((screen.getByLabelText('오늘 든 생각') as HTMLTextAreaElement).value).toBe('내 생각');
  await vi.waitFor(() => expect(document.activeElement).toBe(field));
});

it('입력이 막혀 있는 동안에는 버튼도 막힌다', () => {
  render(h(Harness, { mode: 'quote', spy: vi.fn(), disabled: true }));
  expect(
    (screen.getByRole('button', { name: '사진으로 옮기기' }) as HTMLButtonElement).disabled
  ).toBe(true);
});
