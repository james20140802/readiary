// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SignupPage from '../page';
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: () => ({ auth: { signUp: vi.fn() } }),
}));
vi.mock('@/lib/auth/oauthRedirect', () => ({ isGoogleLoginEnabled: () => false }));
afterEach(cleanup);
function setup(password: string, confirm: string) {
  render(React.createElement(SignupPage));
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'reader@example.com' } });
  fireEvent.change(screen.getByLabelText('비밀번호', { exact: true }), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: confirm } });
  for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole('button', { name: '가입하기' }));
}
it('attaches length errors to password while preserving help and typed values', () => {
  setup('short', 'short');
  const password = screen.getByLabelText('비밀번호', { exact: true });
  expect(document.activeElement).toBe(password);
  expect(password.getAttribute('aria-invalid')).toBe('true');
  expect(password.getAttribute('aria-describedby')?.split(' ')).toEqual([
    'signup-password-help',
    'signup-password-error',
  ]);
  expect(screen.getByLabelText('비밀번호 확인').getAttribute('aria-invalid')).toBeNull();
  expect((password as HTMLInputElement).value).toBe('short');
  fireEvent.change(password, { target: { value: 'long-enough' } });
  expect(password.getAttribute('aria-invalid')).toBeNull();
  expect(password.getAttribute('aria-describedby')).toBe('signup-password-help');
});
it('attaches mismatch to confirmation and preserves the password', () => {
  setup('long-enough', 'different');
  const confirm = screen.getByLabelText('비밀번호 확인');
  expect(document.activeElement).toBe(confirm);
  expect(confirm.getAttribute('aria-invalid')).toBe('true');
  expect(
    screen.getByLabelText('비밀번호', { exact: true }).getAttribute('aria-invalid')
  ).toBeNull();
  fireEvent.change(confirm, { target: { value: 'long-enough' } });
  expect(confirm.getAttribute('aria-invalid')).toBeNull();
  expect((screen.getByLabelText('비밀번호', { exact: true }) as HTMLInputElement).value).toBe(
    'long-enough'
  );
});
