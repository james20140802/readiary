// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import EntryFormBody from '../EntryFormBody';

vi.mock('@/components/ui/ActionNavigation', () => ({ default: () => null }));
// 사진에서 "새 문장"을 골라 돌려주는 버튼으로 바꾼다
vi.mock('@/components/photo-quote/PhotoQuoteButton', () => ({
  default: ({ onText, disabled }: { onText(text: string): void; disabled?: boolean }) =>
    React.createElement(
      'button',
      { type: 'button', disabled, onClick: () => onText('새 문장') },
      '사진으로 옮기기'
    ),
}));
afterEach(cleanup);

const form = (initial?: { quote?: string }) =>
  render(React.createElement(EntryFormBody, { submitLabel: '남기기', onSubmit: vi.fn(), initial }));
const quote = () => screen.getByLabelText('문장') as HTMLTextAreaElement;

it('빈 문장 칸에는 사진에서 고른 글이 그대로 들어가고 커서가 끝에 놓인다', () => {
  form();
  fireEvent.click(screen.getByRole('button', { name: '사진으로 옮기기' }));
  expect(quote().value).toBe('새 문장');
  expect(document.activeElement).toBe(quote());
  expect(quote().selectionStart).toBe('새 문장'.length);
});

it('쓰던 문장을 덮어쓰지 않고 빈 줄 하나 뒤에 붙인다', () => {
  form({ quote: '쓰던 글' });
  fireEvent.click(screen.getByRole('button', { name: '사진으로 옮기기' }));
  expect(quote().value).toBe('쓰던 글\n\n새 문장');
  expect((screen.getByLabelText('생각') as HTMLTextAreaElement).value).toBe('');
});

it('내용이 없다는 오류가 떠 있었다면 사진의 글이 들어오면서 지워진다', () => {
  form();
  fireEvent.click(screen.getByRole('button', { name: '남기기' }));
  expect(quote().getAttribute('aria-invalid')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '사진으로 옮기기' }));
  expect(quote().getAttribute('aria-invalid')).toBeNull();
  expect(screen.queryByText('문장이나 생각 중 하나는 남겨주세요.')).toBeNull();
});
