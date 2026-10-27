// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SignupPage from '../page';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('redirect=/invite/abc'),
}));
vi.mock('@/lib/auth/oauthRedirect', () => ({
  isGoogleLoginEnabled: () => true,
  buildOAuthRedirectTo: () => 'https://readiary.test/auth/confirm',
}));
vi.mock('@/lib/supabase/client', () => ({ createSupabaseClient: () => ({ auth: {} }) }));
afterEach(cleanup);

it('첫 장은 가입 방법만 고르게 한다 — 입력칸·체크 없이 이메일과 Google 두 갈래', () => {
  render(React.createElement(SignupPage));
  expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  expect(screen.getByRole('link', { name: '이메일로 가입하기' }).getAttribute('href')).toBe(
    '/signup/email?redirect=%2Finvite%2Fabc'
  );
  const google = screen.getByRole('button', { name: /Google로 가입하기/ });
  expect((google as HTMLButtonElement).disabled).toBe(false);
  expect(screen.getByRole('link', { name: /서비스 이용 약관/ }).getAttribute('href')).toBe(
    '/terms'
  );
});
