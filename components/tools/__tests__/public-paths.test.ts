// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import InviteView from '../InviteView';
import PublicHeader from '../PublicHeader';

afterEach(cleanup);

describe('비로그인 방문자의 길', () => {
  it('초대 화면은 가입·로그인 모두 초대 주소로 돌아오게 한다', () => {
    render(
      createElement(InviteView, {
        nickname: 'jiwoo',
        tag: '2041',
        invitePath: '/invite/jiwoo-2041',
      })
    );
    const back = encodeURIComponent('/invite/jiwoo-2041');
    expect(
      screen.getByRole('link', { name: '가입하고 친구 맺으러 가기' }).getAttribute('href')
    ).toBe(`/signup?redirect=${back}`);
    expect(
      screen.getByRole('link', { name: '이미 계정이 있어요 · 로그인' }).getAttribute('href')
    ).toBe(`/login?redirect=${back}`);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('jiwoo#2041');
  });

  it('공개 화면 머리는 로그인·시작하기를 둔다', () => {
    render(createElement(PublicHeader));
    expect(screen.getByRole('link', { name: '로그인' }).getAttribute('href')).toBe('/login');
    expect(screen.getByRole('link', { name: '시작하기' }).getAttribute('href')).toBe('/signup');
  });

  it('밖으로 새는 돌아올 주소는 싣지 않는다', () => {
    render(createElement(PublicHeader, { redirect: '//evil.test' }));
    expect(screen.getByRole('link', { name: '로그인' }).getAttribute('href')).toBe('/login');
  });

  it('수신거부처럼 계정과 무관한 화면은 이름만', () => {
    render(createElement(PublicHeader, { auth: false }));
    expect(screen.queryByRole('link', { name: '로그인' })).toBeNull();
  });
});
