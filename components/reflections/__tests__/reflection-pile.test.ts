// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import ReflectionPile from '../ReflectionPile';

afterEach(cleanup);

const item = (id: string, at: string, body: string) => ({
  id,
  entry_id: 'entry',
  body,
  is_private: false,
  created_at: at,
  updated_at: at,
});

it('맨 위 간지만 읽히고 고칠 수 있으며, 머리는 기록한 날로부터 센다', () => {
  render(
    React.createElement(ReflectionPile, {
      items: [
        item('new', '2026-10-06T02:00:00Z', '가장 최근 생각'),
        item('old', '2026-09-18T02:00:00Z', '이틀 뒤의 생각'),
      ],
      entryDate: '2026-09-16',
      today: '2026-10-06',
      canWrite: true,
      entryIsPrivate: false,
    })
  );
  expect(screen.getByText('20일 뒤 · 오늘')).toBeTruthy();
  // 아래 장은 보조기기에서 숨는다 — 고치기 버튼은 맨 위 장의 것 하나만 잡힌다
  expect(screen.getAllByRole('button', { name: '고치기' })).toHaveLength(1);
  expect(screen.getByRole('button', { name: '다음 간지' })).toBeTruthy();
  expect(screen.getByText('1/2')).toBeTruthy();
});

it('덧붙인 생각이 없으면 빈 말과 덧붙이기만', () => {
  render(
    React.createElement(ReflectionPile, {
      items: [],
      today: '2026-10-06',
      canWrite: true,
      entryIsPrivate: false,
      emptyText: '다시 읽으니 어떤 생각이 드나요?',
      addAction: React.createElement('button', null, '지금의 생각 덧붙이기'),
    })
  );
  expect(screen.getByText('다시 읽으니 어떤 생각이 드나요?')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '다음 간지' })).toBeNull();
});
