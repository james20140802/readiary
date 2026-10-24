import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Landing from '../Landing';

const html = renderToStaticMarkup(createElement(Landing));

describe('랜딩', () => {
  it('첫 화면의 주요 행동은 가입, 보조 행동은 아래 장면으로 내려간다', () => {
    expect(html).toMatch(/<a[^>]*href="\/signup"[^>]*>기록 시작하기<\/a>/);
    expect(html).toMatch(/<a[^>]*href="#look"[^>]*>둘러보기<\/a>/);
    expect(html).toContain('id="look"');
  });

  it('마지막 장면에서도 가입으로 갈 수 있다', () => {
    expect(html.match(/href="\/signup"/g)).toHaveLength(3);
  });

  it('제목은 h1 하나이고 장면마다 소제목이 있다', () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html.match(/<h2[\s>]/g)!.length).toBeGreaterThanOrEqual(6);
  });

  it('장식 그림은 보조기기에서 감추고 안에 초점 받을 요소가 없다', () => {
    const hidden = html.split('aria-hidden="true"').slice(1);
    expect(hidden.length).toBeGreaterThanOrEqual(5);
    // 장식 안에는 링크·버튼이 없다(가짜 "남기기"는 span)
    expect(html).not.toMatch(/<button/);
  });

  it('푸터에 약관과 개인정보처리방침 링크를 둔다', () => {
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
  });
});

it('첫 화면 메뉴에서 둘러보기·로그인·기록 시작하기로 갈 수 있다', () => {
  const nav = html.match(/<nav[\s\S]*?<\/nav>/)?.[0] ?? '';
  expect(nav).toContain('aria-label="첫 화면 메뉴"');
  expect(nav).toContain('href="#look"');
  expect(nav).toContain('href="/login"');
  expect(nav).toContain('href="/signup"');
});
