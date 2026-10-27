import { describe, expect, it } from 'vitest';
import { noFocusZoom } from '../viewport';

describe('noFocusZoom', () => {
  it.each([
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      true,
    ],
    ['Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15', true],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
      true,
    ],
    [
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36',
      false,
    ],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130', false],
    ['', false],
  ])('%s → %s', (ua, expected) => expect(noFocusZoom(ua)).toBe(expected));
});
