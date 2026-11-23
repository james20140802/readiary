import { isHeic } from '@/lib/photo-quote/image';
import { isbnFromBarcodes } from './isbn';

/**
 * 뒤표지 사진에서 ISBN 바코드를 읽는다. 사진은 기기 안에서만 읽고 어디에도 보내지 않는다.
 * 브라우저 내장 BarcodeDetector(안드로이드 Chrome 등)가 EAN-13을 읽으면 그것을 쓰고,
 * 없으면(iOS Safari 등) ZXing WebAssembly 판독기를 처음 쓸 때 내려받는다.
 * 판독기 파일은 이 앱이 직접 내준다 — 외부 CDN에 요청하지 않는다.
 */

/** 긴 변을 이 크기로 줄여 읽는다. 바코드 판독에는 충분하고 휴대폰 원본(12MP)보다 훨씬 가볍다 */
const MAX_SIDE = 1600;

export class BarcodePhotoError extends Error {
  constructor() {
    super('이 사진을 열지 못했어요.');
    this.name = 'BarcodePhotoError';
  }
}

interface Detector {
  detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>;
}

type NativeDetectorClass = {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats(): Promise<string[]>;
};

let detectorPromise: Promise<Detector> | null = null;

async function createDetector(): Promise<Detector> {
  const Native = (globalThis as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
  if (Native) {
    try {
      if ((await Native.getSupportedFormats()).includes('ean_13')) {
        return new Native({ formats: ['ean_13'] });
      }
    } catch {
      // 내장 판독기가 있지만 쓸 수 없다 — 아래 ZXing으로
    }
  }
  const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill');
  const wasmUrl = new URL('zxing-wasm/reader/zxing_reader.wasm', import.meta.url).href;
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith('.wasm') ? wasmUrl : prefix + path,
    },
  });
  return new BarcodeDetector({ formats: ['ean_13'] });
}

function detector(): Promise<Detector> {
  detectorPromise ??= createDetector().catch((error) => {
    detectorPromise = null; // 내려받기에 실패했으면 다음에 다시 시도한다
    throw error;
  });
  return detectorPromise;
}

async function openBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    if (!isHeic(file)) throw new BarcodePhotoError();
    try {
      const { heicTo } = await import('heic-to/next');
      const jpeg = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 });
      return await createImageBitmap(jpeg);
    } catch {
      throw new BarcodePhotoError();
    }
  }
}

function shrink(bitmap: ImageBitmap): HTMLCanvasElement | ImageBitmap {
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) return bitmap;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** 사진 속 ISBN(978·979로 시작하는 13자리). 책 바코드가 없으면 null */
export async function readIsbnFromPhoto(file: File): Promise<string | null> {
  const bitmap = await openBitmap(file);
  try {
    const found = await (await detector()).detect(shrink(bitmap));
    return isbnFromBarcodes(found.map((b) => b.rawValue));
  } finally {
    bitmap.close();
  }
}
