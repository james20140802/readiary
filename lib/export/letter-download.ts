import { zipSync } from 'fflate';

/** Package locally generated images into one download without recompressing PNGs. */
export async function bundleLetterImages(files: File[]): Promise<{ blob: Blob; name: string }> {
  if (!files.length) throw new Error('no-images');
  if (files.length === 1) return { blob: files[0], name: files[0].name };
  const entries: Record<string, Uint8Array> = {};
  for (let index = 0; index < files.length; index++) {
    entries[`readiary-letter-${String(index + 1).padStart(2, '0')}.png`] = new Uint8Array(
      await files[index].arrayBuffer()
    );
  }
  const archive = zipSync(entries, { level: 0 });
  return {
    blob: new Blob([new Uint8Array(archive)], { type: 'application/zip' }),
    name: 'readiary-letter.zip',
  };
}
