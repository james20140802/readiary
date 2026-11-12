// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/shell/LargeTitle', () => ({ LargeTitle: () => null }));
vi.mock('@/components/shell/TopBarContext', () => ({ TopBarActions: () => null }));

import { SettingsRow, SwitchRow } from '../SettingsParts';

afterEach(cleanup);

describe('SettingsRow tone', () => {
  it('위험한 줄은 danger 색만 쓰고 ink를 함께 싣지 않는다', () => {
    render(h(SettingsRow, { tone: 'danger', onClick: () => {}, children: '탈퇴하기' }));
    const row = screen.getByRole('button', { name: '탈퇴하기' });
    expect(row.className.split(/\s+/)).toContain('text-danger');
    expect(row.className.split(/\s+/)).not.toContain('text-ink');
  });
  it('보통 줄은 ink 색이다', () => {
    render(h(SettingsRow, { onClick: () => {}, children: '로그아웃' }));
    const row = screen.getByRole('button', { name: '로그아웃' });
    expect(row.className.split(/\s+/)).toContain('text-ink');
    expect(row.className.split(/\s+/)).not.toContain('text-danger');
  });
  it('켜고 끄는 줄도 ink 색이다', () => {
    const { container } = render(
      h(SwitchRow, { title: '알림', checked: false, onChange: () => {} })
    );
    expect((container.firstElementChild as HTMLElement).className.split(/\s+/)).toContain(
      'text-ink'
    );
  });
});
