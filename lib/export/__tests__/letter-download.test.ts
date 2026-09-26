import { describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { bundleLetterImages } from '../letter-download';

describe('bundleLetterImages', () => {
  it('preserves a single PNG directly', async () => {
    const file = new File(['image'], 'readiary-letter-1.png', { type: 'image/png' });
    expect(await bundleLetterImages([file])).toEqual({ blob: file, name: file.name });
  });
  it('includes every image in reading order with identical bytes', async () => {
    const files = Array.from(
      { length: 12 },
      (_, index) => new File([new Uint8Array([137, 80, 78, 71, index])], `page-${index}.png`)
    );
    const result = await bundleLetterImages(files);
    const entries = unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
    const names = Object.keys(entries).sort();
    expect(result.name).toBe('readiary-letter.zip');
    expect(result.blob.type).toBe('application/zip');
    expect(names).toHaveLength(12);
    for (let index = 0; index < files.length; index++) {
      expect(entries[names[index]]).toEqual(new Uint8Array(await files[index].arrayBuffer()));
    }
  });
  it('rejects an empty download', async () => {
    await expect(bundleLetterImages([])).rejects.toThrow('no-images');
  });
});
