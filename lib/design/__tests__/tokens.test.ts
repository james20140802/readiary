import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

/** 중괄호가 맞물리는 블록 본문을 `start` 위치부터 꺼낸다. */
function blockBody(source: string, start: number): string {
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i);
  }
  throw new Error('닫히지 않은 블록');
}

/** globals.css의 첫 `:root`(light)와 다크 미디어 쿼리 `:root`(dark)에서 `--이름: 값;`을 모은다. */
export function readTokens(mode: 'light' | 'dark'): Record<string, string> {
  const body =
    mode === 'light'
      ? blockBody(css, css.indexOf(':root'))
      : (() => {
          const media = blockBody(css, css.indexOf('@media (prefers-color-scheme: dark)'));
          return blockBody(media, media.indexOf(':root'));
        })();
  const tokens: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[m[1]] = m[2].replace(/\s+/g, ' ').trim();
  }
  return tokens;
}

describe('색 토큰', () => {
  it.each([
    ['paper', '244 240 232', '26 23 20'],
    ['ink', '34 30 26', '236 229 218'],
    ['ink-sub', '107 100 90', '177 168 153'],
    ['ink-faint', '158 150 138', '142 132 118'], // 다크는 현행 유지
    ['hairline', '224 217 204', '46 42 37'],
    ['accent', '45 95 184', '133 169 236'], // 다크는 현행 유지
    ['margin', '142 169 221', '79 102 148'],
    ['sheet', '251 250 246', '38 35 31'],
    ['sheet-alpha', '0.62', '0.74'],
  ])('%s 토큰은 시안 값이다', (name, light, dark) => {
    expect(readTokens('light')[`--${name}`]).toBe(light);
    expect(readTokens('dark')[`--${name}`]).toBe(dark);
  });

  it('플래그 여섯 색은 라이트·다크 같은 값이다', () => {
    const flags = {
      yellow: '242 201 76',
      pink: '238 122 154',
      orange: '242 150 72',
      green: '104 190 132',
      blue: '92 140 232',
      purple: '156 128 214',
    };
    for (const [k, v] of Object.entries(flags)) {
      expect(readTokens('light')[`--flag-${k}`]).toBe(v);
      expect(readTokens('dark')[`--flag-${k}`] ?? v).toBe(v);
    }
  });
});

const require = createRequire(import.meta.url);
const tailwindConfig = require(join(process.cwd(), 'tailwind.config.js'));
const fontSize = tailwindConfig.theme.extend.fontSize as Record<
  string,
  [string, { lineHeight: string; fontWeight?: string; letterSpacing?: string }]
>;

describe('글자 토큰', () => {
  it.each([
    ['page-title', '2.125rem', '1.15', '700'],
    ['page-title-lg', '2.5rem', '1.15', '700'],
    ['section-title', '1.625rem', '1.3', '700'],
    ['quote', '1.5625rem', '1.6', '600'],
    ['quote-lg', '1.875rem', '1.55', '600'],
    ['note', '1.1875rem', '1.65', '400'],
    ['body', '1.0625rem', '1.6', '400'],
    ['body-sm', '0.9375rem', '1.5', '400'],
    ['input', '1.125rem', '1.5', undefined],
    ['button', '1.0625rem', '1.25', '600'],
    ['button-sm', '0.9375rem', '1.25', '600'],
    ['button-lg', '1.0625rem', '1.25', '600'],
    ['caption', '0.9375rem', '1.4', '500'],
    ['overline', '0.875rem', '1.4', '600'],
    ['tab', '0.75rem', '1', '600'],
    ['fine', '0.8125rem', '1.5', '500'],
  ])('%s 글자는 시안 크기다', (name, size, lh, weight) => {
    const [s, o] = fontSize[name];
    expect(s).toBe(size);
    expect(o.lineHeight).toBe(lh);
    expect(o.fontWeight).toBe(weight);
  });

  it.each([
    ['page-title', '-0.01em'],
    ['page-title-lg', '-0.01em'],
    ['section-title', '-0.01em'],
    ['quote', '-0.01em'],
    ['quote-lg', '-0.015em'],
    ['overline', undefined],
  ])('%s 자간은 시안 값이다', (name, spacing) => {
    expect(fontSize[name][1].letterSpacing).toBe(spacing);
  });
});

describe('스크롤 상자', () => {
  it('body·html은 overflow-y로 스크롤 상자를 만들지 않는다', () => {
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    const offenders = rules.flatMap(([, selectors, decls]) => {
      const list = selectors.split(',').map((s) => s.trim());
      const touchesRoot = list.some((s) => /^(html|body)$/.test(s));
      if (!touchesRoot) return [];
      const m = decls.match(/(?:^|[;\s])overflow-y\s*:\s*([^;]+)/);
      return m && m[1].trim() !== 'visible'
        ? [`${selectors.trim()} { overflow-y: ${m[1].trim()} }`]
        : [];
    });
    expect(offenders).toEqual([]);
  });
});
