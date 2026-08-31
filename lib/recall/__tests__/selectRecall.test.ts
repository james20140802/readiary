import { describe, expect, it } from 'vitest';
import { selectRecall, type RecallCandidate } from '../selectRecall';

const c = (id: string, date: string): RecallCandidate => ({ id, date });

describe('selectRecall', () => {
  it('같은 월-일의 과거 기록을 최우선, 여러 해면 가장 오래된 것', () => {
    const picked = selectRecall(
      [c('a', '2024-08-27'), c('b', '2025-08-27'), c('d', '2025-01-01')],
      '2026-08-27',
      'seed'
    );
    expect(picked?.id).toBe('a');
  });
  it('같은 월-일이 없으면 7일 이상 지난 기록 중에서 시드 결정적으로 고른다', () => {
    const cands = [c('a', '2026-06-01'), c('b', '2026-05-01'), c('e', '2026-08-25')];
    const p1 = selectRecall(cands, '2026-08-27', 'user1|2026-08-27');
    const p2 = selectRecall(cands, '2026-08-27', 'user1|2026-08-27');
    expect(p1?.id).toBe(p2?.id); // 같은 날·같은 사용자 = 같은 카드
    expect(['a', 'b']).toContain(p1?.id); // 7일 이내 기록('e')은 후보 제외
  });
  it('7일 이상 지난 기록이 하나도 없으면 null (신규 사용자 숨김)', () => {
    expect(selectRecall([c('e', '2026-08-25')], '2026-08-27', 's')).toBeNull();
  });
  it('빈 배열이면 null', () => {
    expect(selectRecall([], '2026-08-27', 's')).toBeNull();
  });
});
