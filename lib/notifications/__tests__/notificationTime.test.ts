import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NotificationList from '@/app/protected/social/_components/NotificationList';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('알림 상대시간 렌더링', () => {
  it('분 경계를 넘겨 hydration해도 서버 기준 시각이 같으면 같은 HTML을 만든다', () => {
    vi.stubGlobal('React', React);
    vi.useFakeTimers();
    const props = {
      referenceTime: '2026-09-07T00:00:59.999Z',
      notifications: [
        {
          id: 'notification-1',
          type: 'like' as const,
          createdAt: '2026-09-07T00:00:00.000Z',
          readAt: null,
          entryId: null,
          actorNickname: '친구',
          actorProfileImage: null,
        },
      ],
    };
    vi.setSystemTime(new Date(props.referenceTime));
    const server = renderToStaticMarkup(React.createElement(NotificationList, props));
    vi.setSystemTime(new Date('2026-09-07T00:01:00.001Z'));
    const client = renderToStaticMarkup(React.createElement(NotificationList, props));
    expect(client).toBe(server);
    expect(client).toContain('방금 전');
    expect(client).toContain('dateTime="2026-09-07T00:00:00.000Z"');
    const refreshed = renderToStaticMarkup(
      React.createElement(NotificationList, {
        ...props,
        referenceTime: '2026-09-07T00:01:00.001Z',
      })
    );
    expect(refreshed).toContain('1분 전');
  });
});
