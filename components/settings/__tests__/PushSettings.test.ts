import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PUSH_LABELS, PushSettingsView } from '../PushSettings';
import { PUSH_KINDS } from '@/lib/push/types';

afterEach(() => vi.unstubAllGlobals());

describe('받을 알림 고르기', () => {
  it('고를 수 있는 종류가 모두 보인다 — 토론 소식 포함', () => {
    vi.stubGlobal('React', React);
    const html = renderToStaticMarkup(
      React.createElement(PushSettingsView, {
        loaded: true,
        busy: false,
        device: true,
        enabled: true,
        kinds: ['debate'],
        testAvailable: false,
        scheduledAvailable: true,
        disabledReason: '',
        onToggleKind: () => {},
        onEnable: () => {},
        onSave: () => {},
        onStop: () => {},
        onTest: () => {},
      })
    );
    for (const kind of PUSH_KINDS) expect(html).toContain(PUSH_LABELS[kind].title);
    expect(html).toContain('토론 소식');
  });
});
