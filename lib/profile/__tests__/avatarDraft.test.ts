import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvatarCleanupError, AvatarDraft } from '../avatarDraft';

const userId = '11111111-1111-4111-8111-111111111111';
const oldPath = `${userId}/old.jpg`;
const file = (name = 'a.png') => new File(['image'], name, { type: 'image/png' });
function storage() {
  return {
    upload: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

describe('AvatarDraft', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${Math.random()}`);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('select A then B uploads only B on save and deletes the original after the DB write', async () => {
    const draft = new AvatarDraft(userId, oldPath);
    const bucket = storage();
    const a = file(),
      b = file('b.png');
    draft.select(a);
    const preview = draft.source;
    draft.select(b);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(preview);
    expect(bucket.upload).not.toHaveBeenCalled();
    const persist = vi.fn(async () => expect(bucket.remove).not.toHaveBeenCalled());
    await draft.save(bucket, persist);
    expect(bucket.upload).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(new RegExp(`^${userId}/.+\\.png$`)),
      b
    );
    expect(persist).toHaveBeenCalledWith(draft.source);
    expect(bucket.remove).toHaveBeenCalledWith([oldPath]);
  });

  it('select then remove never uploads the discarded file', async () => {
    const draft = new AvatarDraft(userId, oldPath),
      bucket = storage();
    draft.select(file());
    draft.select(null);
    const persist = vi.fn().mockResolvedValue(undefined);
    await draft.save(bucket, persist);
    expect(bucket.upload).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledWith(null);
    expect(bucket.remove).toHaveBeenCalledWith([oldPath]);
  });

  it('leaving without saving only revokes the preview; stored original remains untouched', () => {
    const draft = new AvatarDraft(userId, oldPath);
    draft.select(file());
    const preview = draft.source;
    draft.dispose();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(preview);
  });

  it('DB failure removes the new upload, not the original, and retains the local draft for retry', async () => {
    const draft = new AvatarDraft(userId, oldPath),
      bucket = storage();
    draft.select(file());
    const preview = draft.source;
    await expect(
      draft.save(bucket, async () => {
        throw new Error('database');
      })
    ).rejects.toThrow('database');
    expect(bucket.remove).toHaveBeenCalledWith([bucket.upload.mock.calls[0][0]]);
    expect(draft.source).toBe(preview);
  });

  it('cleanup failure is visible and retry deletes the old file without uploading again', async () => {
    const draft = new AvatarDraft(userId, oldPath),
      bucket = storage();
    draft.select(file());
    bucket.remove.mockRejectedValueOnce(new Error('storage unavailable'));
    const persist = vi.fn().mockResolvedValue(undefined);
    await expect(draft.save(bucket, persist)).rejects.toBeInstanceOf(AvatarCleanupError);
    const savedPath = draft.source;
    await draft.save(bucket, persist);
    expect(bucket.upload).toHaveBeenCalledTimes(1);
    expect(bucket.remove).toHaveBeenNthCalledWith(2, [oldPath]);
    expect(draft.source).toBe(savedPath);
  });

  it('failed rollback is retried before another upload', async () => {
    const draft = new AvatarDraft(userId, oldPath),
      bucket = storage();
    draft.select(file());
    bucket.remove.mockRejectedValueOnce(new Error('offline'));
    await expect(
      draft.save(bucket, async () => {
        throw new Error('db');
      })
    ).rejects.toBeInstanceOf(AvatarCleanupError);
    bucket.remove.mockRejectedValueOnce(new Error('still offline'));
    await expect(draft.save(bucket, vi.fn())).rejects.toBeInstanceOf(AvatarCleanupError);
    expect(bucket.upload).toHaveBeenCalledTimes(1);
  });

  it('rejects edits and duplicate saves while persistence is in flight', async () => {
    const draft = new AvatarDraft(userId, oldPath),
      bucket = storage();
    let finish!: () => void;
    const saving = draft.save(
      bucket,
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    await Promise.resolve();
    expect(() => draft.select(file())).toThrow('저장이 끝난');
    await expect(draft.save(bucket, vi.fn())).rejects.toThrow('이미 저장');
    finish();
    await saving;
  });

  it('rejects invalid files without changing the existing draft', () => {
    const draft = new AvatarDraft(userId, oldPath);
    expect(() => draft.select(new File(['<svg/>'], 'a.png', { type: 'image/svg+xml' }))).toThrow();
    expect(draft.source).toBe(oldPath);
    expect(() =>
      draft.select(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'a.png', { type: 'image/png' }))
    ).toThrow('2MB');
  });
});
