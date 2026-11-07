import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load } from 'cheerio';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NotificationList from '@/app/(app)/social/_components/NotificationList';
import type { NotificationItem, NotificationType } from '@/lib/notifications/types';

const referenceTime = '2026-09-29T12:00:00.000Z';
function notification(
  type: NotificationType,
  entryId: string | null,
  monthlyExcerptMonth: string | null = null
): NotificationItem {
  return {
    id: `${type}-${entryId}-${monthlyExcerptMonth}`,
    type,
    entryId,
    monthlyExcerptMonth,
    createdAt: referenceTime,
    readAt: null,
    actorNickname: '친구',
    actorProfileImage: null,
  };
}
function render(notifications: NotificationItem[]) {
  vi.stubGlobal('React', React);
  return load(
    renderToStaticMarkup(React.createElement(NotificationList, { notifications, referenceTime }))
  );
}
afterEach(() => vi.unstubAllGlobals());

describe('알림의 이동 의미', () => {
  it.each(['like', 'comment'] as const)(
    '연결 없는 %s 알림은 설명을 제공하고 조작 대상으로 노출하지 않는다',
    (type) => {
      const $ = render([notification(type, null)]);
      expect($('li').text()).toContain('연결된 기록을 열 수 없어요');
      expect($('li').text()).toContain('읽지 않음');
      expect($('a, button, [role="button"], [tabindex]').length).toBe(0);
      expect($('time').attr('datetime')).toBe(referenceTime);
    }
  );
  it('정상 반응과 친구 알림의 목적지를 유지한다', () => {
    const $ = render([
      notification('like', 'entry-1'),
      notification('comment', 'entry-2'),
      notification('friend_accept', null),
      notification('friend_request', null),
    ]);
    expect(
      $('a')
        .map((_, el) => $(el).attr('href'))
        .get()
    ).toEqual([
      '/entry/entry-1',
      '/entry/entry-2',
      '/social/friends',
      '/social/friends?tab=pending',
    ]);
    expect($.text()).not.toContain('연결된 기록을 열 수 없어요');
  });

  it('달의 발췌집 반응은 내 그달 발췌집으로 간다', () => {
    const $ = render([
      notification('excerpt_like', null, '2026-03'),
      notification('excerpt_comment', null, '2026-02'),
    ]);
    expect(
      $('a')
        .map((_, el) => $(el).attr('href'))
        .get()
    ).toEqual(['/excerpts/2026-03', '/excerpts/2026-02']);
    expect($.text()).toContain('달의 발췌집을 좋아해요');
    expect($.text()).toContain('달의 발췌집에 댓글을 남겼어요');
    expect($.text()).not.toContain('열 수 없어요');
  });

  it.each(['excerpt_like', 'excerpt_comment'] as const)(
    '권을 찾지 못한 %s 알림은 이유를 말하고 링크를 걸지 않는다',
    (type) => {
      const $ = render([notification(type, null, null)]);
      expect($('li').text()).toContain('연결된 발췌집을 열 수 없어요');
      expect($('a, button, [role="button"], [tabindex]').length).toBe(0);
    }
  );
});
