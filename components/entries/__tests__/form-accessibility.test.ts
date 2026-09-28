// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import EntryFormBody from '../EntryFormBody';
vi.mock('@/components/ui/ActionNavigation', () => ({ default: () => null }));
afterEach(cleanup);
it('connects the empty-content error to both alternatives, focuses quote, and clears after a note', () => {
  const submit = vi.fn();
  render(React.createElement(EntryFormBody, { submitLabel: '남기기', onSubmit: submit }));
  fireEvent.click(screen.getByRole('button', { name: '남기기' }));
  const quote = screen.getByLabelText('문장');
  const note = screen.getByLabelText('생각');
  expect(document.activeElement).toBe(quote);
  expect(quote.getAttribute('aria-invalid')).toBe('true');
  const id = quote.getAttribute('aria-describedby')!;
  expect(note.getAttribute('aria-describedby')).toBe(id);
  expect(document.getElementById(id)?.textContent).toBe('문장이나 생각 중 하나는 남겨주세요.');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(submit).not.toHaveBeenCalled();
  fireEvent.change(note, { target: { value: '내 생각' } });
  expect(note.getAttribute('aria-invalid')).toBeNull();
  expect(quote.getAttribute('aria-describedby')).toBeNull();
  expect((note as HTMLTextAreaElement).value).toBe('내 생각');
});
