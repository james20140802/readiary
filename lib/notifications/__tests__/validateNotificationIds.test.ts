import { describe, expect, it } from 'vitest';
import {
  MAX_NOTIFICATION_READ_IDS,
  validateNotificationIds,
} from '@/lib/notifications/validateNotificationIds';

const UUID_A = '11111111-1111-1111-1111-111111111111';
const UUID_B = '22222222-2222-2222-2222-222222222222';

describe('validateNotificationIds', () => {
  it('UUID 문자열 배열은 통과한다', () => {
    expect(validateNotificationIds([UUID_A, UUID_B])).toBe(true);
  });

  it('빈 배열은 거부한다', () => {
    expect(validateNotificationIds([])).toBe(false);
  });

  it('배열이 아니면 거부한다', () => {
    expect(validateNotificationIds(UUID_A)).toBe(false);
    expect(validateNotificationIds(undefined)).toBe(false);
    expect(validateNotificationIds(null)).toBe(false);
  });

  it('UUID가 아닌 문자열이 섞이면 거부한다', () => {
    expect(validateNotificationIds([UUID_A, 'not-a-uuid'])).toBe(false);
  });

  it('문자열이 아닌 요소가 섞이면 거부한다', () => {
    expect(validateNotificationIds([UUID_A, 123])).toBe(false);
  });

  it(`상한(${MAX_NOTIFICATION_READ_IDS}개)까지는 통과한다`, () => {
    const ids = Array.from({ length: MAX_NOTIFICATION_READ_IDS }, () => UUID_A);
    expect(validateNotificationIds(ids)).toBe(true);
  });

  it(`상한을 넘으면 거부한다`, () => {
    const ids = Array.from({ length: MAX_NOTIFICATION_READ_IDS + 1 }, () => UUID_A);
    expect(validateNotificationIds(ids)).toBe(false);
  });
});
