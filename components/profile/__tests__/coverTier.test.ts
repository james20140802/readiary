import { describe, expect, it } from 'vitest';
import { coverTier } from '../coverTier';

describe('coverTier', () => {
  it('짧은 문장은 큰 글자, 길수록 작은 단계', () => {
    expect(coverTier('질문을 바꾸면 같은 하루도 다른 얼굴을 한다')).toBe('lg');
    expect(
      coverTier(
        '생각이 깊어진다는 것은 무엇을 내려놓을지 알게 되는 일이다, 그리고 다시 시작하는 일'
      )
    ).toBe('md');
    expect(
      coverTier(
        '아니, 벌써 떠날 시간이 되었군요. 나는 죽으러, 여러분은 살러 갈 시간이. 우리 중 어느 쪽이 더 좋은 일을 향해 가고 있는지는 신 말고는 그 누구에게도 분명치 않습니다.'
      )
    ).toBe('sm');
  });
});
