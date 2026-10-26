// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import EmailConsentField from '../EmailConsentField';
import { EMAIL_CONSENT_DETAILS } from '@/lib/email/consent';

afterEach(cleanup);

it('온보딩용 compact는 체크박스 한 줄만 — 설명·받는 주소·처리방침 링크를 다시 싣지 않는다', () => {
  const onChange = vi.fn();
  render(
    React.createElement(EmailConsentField, {
      compact: true,
      checked: false,
      onChange,
      email: 'reader@example.com',
    })
  );
  const box = screen.getByRole('checkbox', { name: /Readiary 소식·이벤트 이메일 받기 \(선택\)/ });
  expect((box as HTMLInputElement).checked).toBe(false);
  expect(screen.queryByText(EMAIL_CONSENT_DETAILS)).toBeNull();
  expect(screen.queryByText(/받는 주소/)).toBeNull();
  expect(screen.queryAllByRole('link')).toHaveLength(0);
  fireEvent.click(box);
  expect(onChange).toHaveBeenCalledWith(true);
});

it('알림 설정용 기본형은 설명과 처리방침 링크를 그대로 보여 준다', () => {
  render(
    React.createElement(EmailConsentField, {
      checked: false,
      onChange: () => {},
      email: 'reader@example.com',
    })
  );
  expect(screen.getByText(EMAIL_CONSENT_DETAILS)).toBeTruthy();
  expect(screen.getByRole('link', { name: /개인정보 처리방침/ })).toBeTruthy();
});
