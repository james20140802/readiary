// @vitest-environment jsdom
import { createElement as h, createRef, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Textarea } from '../Textarea';

afterEach(cleanup);

function Controlled({ initial = '' }: { initial?: string }) {
  const [v, setV] = useState(initial);
  return h(Textarea, {
    'aria-label': '글',
    autoGrow: true,
    value: v,
    onChange: (e) => setV(e.target.value),
  });
}

describe('Textarea autoGrow', () => {
  it('손잡이 없이 쓴 만큼 늘어나고, 지우면 줄어든다', () => {
    render(h(Controlled));
    const area = screen.getByLabelText('글') as HTMLTextAreaElement;
    expect(area.className).toContain('resize-none');
    let sh = 180;
    Object.defineProperty(area, 'scrollHeight', { configurable: true, get: () => sh });
    fireEvent.change(area, { target: { value: '여러\n줄' } });
    expect(area.style.height).toBe('180px');
    sh = 90;
    fireEvent.change(area, { target: { value: '짧게' } });
    expect(area.style.height).toBe('90px');
  });

  it('바깥에서 넘긴 ref도 그대로 받는다', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(h(Textarea, { 'aria-label': '글', autoGrow: true, ref, defaultValue: '' }));
    expect(ref.current).toBe(screen.getByLabelText('글'));
  });

  it('autoGrow가 없으면 지금처럼 둔다', () => {
    render(h(Textarea, { 'aria-label': '글' }));
    expect((screen.getByLabelText('글') as HTMLElement).className).not.toContain('resize-none');
  });
});
