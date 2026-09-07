import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, it, expect, vi } from 'vitest';
describe('generated-worker source behavior', () => {
  it('shows a visible fallback for malformed push and ignores arbitrary click URLs', async () => {
    const handlers: Record<string, (event: unknown) => void> = {};
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const openWindow = vi.fn().mockResolvedValue(undefined);
    vm.runInNewContext(readFileSync('worker/index.js', 'utf8'), {
      URL,
      self: {
        addEventListener: (kind: string, fn: (event: unknown) => void) => {
          handlers[kind] = fn;
        },
        registration: { showNotification },
        location: { origin: 'https://readiary.test' },
        clients: { openWindow },
      },
    });
    const waitUntil = vi.fn();
    handlers.push({
      data: {
        json: () => {
          throw new Error('bad payload');
        },
      },
      waitUntil,
    });
    expect(showNotification).toHaveBeenCalledWith(
      'Readiary',
      expect.objectContaining({ body: '돌아볼 독서 소식이 있어요' })
    );
    handlers.notificationclick({
      notification: { close: vi.fn(), data: { url: 'https://evil.test' } },
      waitUntil,
    });
    expect(openWindow).toHaveBeenCalledWith('https://readiary.test/protected/notifications/inbox');
  });
});
