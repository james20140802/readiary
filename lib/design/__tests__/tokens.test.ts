import { readFileSync } from 'node:fs';
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
