// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import InertBackground from '../InertBackground';

let main: HTMLElement;
let hidden: HTMLElement;

beforeEach(() => {
  main = document.createElement('main');
  hidden = document.createElement('div');
  hidden.setAttribute('aria-hidden', 'true');
  document.body.append(main, hidden);
});
afterEach(() => {
  cleanup();
  main.remove();
  hidden.remove();
});

const expectOriginal = () => {
  expect(!main.inert).toBe(true);
  expect(main.hasAttribute('aria-hidden')).toBe(false);
  expect(!hidden.inert).toBe(true);
  expect(hidden.getAttribute('aria-hidden')).toBe('true');
};

describe('InertBackground', () => {
  it('겹쳐 열고 먼저 연 쪽을 먼저 닫아도 끝에는 원래 값으로 돌아간다', () => {
    const a = render(h(InertBackground));
    expect(main.inert).toBe(true);
    const b = render(h(InertBackground));
    a.unmount();
    expect(main.inert).toBe(true);
    b.unmount();
    expectOriginal();
  });
  it('나중에 연 쪽을 먼저 닫아도 마찬가지다', () => {
    const a = render(h(InertBackground));
    const b = render(h(InertBackground));
    b.unmount();
    expect(main.inert).toBe(true);
    a.unmount();
    expectOriginal();
  });
});
