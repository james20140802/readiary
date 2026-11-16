// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBarProvider } from '@/components/shell/TopBarContext';
import DebateList from '../DebateList';
import type { DebateListItem } from '@/lib/debate/types';

// 실패는 vi.fn 대신 평범한 함수로 흉내 낸다 — vi.fn은 거부된 결과를 테스트 실패로 보고한다
const fetchDebateList = vi.fn();
const calls: unknown[] = [];
let failNext = false;
vi.mock('@/lib/debate/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/debate/client')>()),
  fetchDebateList: (...a: unknown[]) => {
    calls.push(a[0]);
    if (failNext) return Promise.reject(new Error('x'));
    return fetchDebateList(...a);
  },
}));

const item = (over: Partial<DebateListItem> = {}): DebateListItem => ({
  id: 'd1',
  owner: {
    id: 'o',
    nickname: '윤서',
    tag: '0001',
    profileImage: null,
    isFriend: true,
    isMe: false,
  },
  quote: '경계와 문턱이 사라짐과 동시에',
  underlines: [{ start: 0, end: 5 }],
  question: '가까워질수록?',
  totals: { agree: 4, differ: 3, question: 1, movedPeople: 2 },
  answerCount: 8,
  topLine: { nickname: '도현', body: '사라지는 건 상상 속의 상대뿐이에요.', kind: 'most_moved' },
  summaryFirstLine: null,
  closedAt: null,
  lastActivityAt: '2026-11-17T00:00:00Z',
  ...over,
});

const renderList = (props: Partial<Parameters<typeof DebateList>[0]> = {}) =>
  render(
    h(
      TopBarProvider,
      null,
      h(DebateList, {
        initialOpen: {
          items: [item(), item({ id: 'd2', question: '둘째 질문', topLine: null })],
          nextBefore: null,
        },
        initialClosed: {
          items: [
            item({
              id: 'd3',
              closedAt: 't',
              summaryFirstLine: '매일 다시 고르는 일이라는 쪽으로 모였어요.',
            }),
          ],
          nextBefore: null,
        },
        friendCount: 3,
        ...props,
      })
    )
  );

beforeEach(() => {
  fetchDebateList.mockReset();
  calls.length = 0;
  failNext = false;
});
afterEach(cleanup);

describe('DebateList', () => {
  it('진행 중과 정리된 토론, 발제하기', () => {
    renderList();
    expect(screen.getByText('가까워질수록?')).toBeTruthy();
    expect(screen.getByText('둘째 질문')).toBeTruthy();
    expect(screen.getByText('생각을 가장 많이 바꾼 답 · 도현')).toBeTruthy();
    expect(screen.getByText('매일 다시 고르는 일이라는 쪽으로 모였어요.')).toBeTruthy();
    expect(screen.getByRole('link', { name: '발제하기' }).getAttribute('href')).toBe(
      '/social/talk/new'
    );
    expect(screen.getAllByRole('link', { name: /가까워질수록\?/ })[0].getAttribute('href')).toBe(
      '/social/talk/d1'
    );
  });

  it('비어 있으면 발제를 설명하고, 친구가 없으면 친구 찾기로', () => {
    renderList({
      initialOpen: { items: [], nextBefore: null },
      initialClosed: { items: [], nextBefore: null },
      friendCount: 0,
    });
    expect(
      screen.getByText('내 기록 하나를 고르고, 함께 볼 곳에 밑줄을 긋고, 질문을 붙여요')
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: '친구 찾기' }).getAttribute('href')).toBe(
      '/social/friends'
    );
  });

  it('정리된 쪽 더 보기가 실패해도 진행 중 목록은 남고 그쪽만 다시 시도', async () => {
    failNext = true;
    renderList({
      initialClosed: {
        items: [item({ id: 'd3', closedAt: 't' })],
        nextBefore: '2026-11-01T00:00:00Z',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: '정리된 토론 더 보기' }));
    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeTruthy();
    expect(calls).toEqual([{ closed: true, before: '2026-11-01T00:00:00Z' }]);
    expect(screen.getByText('가까워질수록?')).toBeTruthy();
  });
});
