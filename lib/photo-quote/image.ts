import { PHOTO_TEXT_MAX_BYTES } from './config';
import { fitWithin } from './select';

/** 사진을 열지 못했다 — 브라우저가 모르는 형식이거나 깨진 파일 */
export class PhotoOpenError extends Error {
  constructor() {
    super('이 사진을 열지 못했어요.');
    this.name = 'PhotoOpenError';
  }
}

type FileLike = { type: string; name: string };

/** 아이폰 사진 형식(HEIC·HEIF)인지. Chrome은 형식 이름을 비워 두기도 해서 확장자도 본다 */
export function isHeic(file: FileLike): boolean {
  return /^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

export function isImageFile(file: FileLike): boolean {
  return file.type.startsWith('image/') || isHeic(file);
}

/** 서버로 보낼 사진. `url`은 화면에 보여 줄 주소이며 다 쓰면 호출자가 `URL.revokeObjectURL`로 놓는다 */
export interface PreparedPhoto {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

function open(blob: Blob): Promise<ImageBitmap> {
  // 회전 정보를 반영해 연다 — 캔버스에 다시 그리면서 EXIF(위치 등)는 떨어진다
  return createImageBitmap(blob, { imageOrientation: 'from-image' });
}

/**
 * 브라우저가 못 여는 HEIC을 기기 안에서 JPEG로 바꾼다. 변환 모듈(libheif)은 크기가 커서
 * HEIC을 실제로 만났을 때만 내려받는다. 사진을 서버로 보내 변환하지 않는다.
 */
async function convertHeic(file: Blob): Promise<Blob> {
  const { heicTo } = await import('heic-to/next');
  return heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 });
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * 고른 사진을 긴 변 2,000px 이하의 JPEG로 만든다. Safari는 HEIC을 바로 열고,
 * Chrome·Firefox처럼 못 여는 브라우저에서만 `onConverting`을 부른 뒤 변환한다.
 */
export async function preparePhoto(file: File, onConverting?: () => void): Promise<PreparedPhoto> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await open(file);
  } catch {
    if (!isHeic(file)) throw new PhotoOpenError();
    onConverting?.();
    try {
      bitmap = await open(await convertHeic(file));
    } catch {
      throw new PhotoOpenError();
    }
  }

  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    if (width === 0 || height === 0) throw new PhotoOpenError();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new PhotoOpenError();
    context.drawImage(bitmap, 0, 0, width, height);

    // 보통 수백 KB다. 드물게 서버 상한을 넘으면 품질을 낮춰 다시 만든다.
    let blob: Blob | null = null;
    for (const quality of [0.9, 0.8, 0.7, 0.5]) {
      blob = await encode(canvas, quality);
      if (blob && blob.size <= PHOTO_TEXT_MAX_BYTES) break;
    }
    if (!blob || blob.size > PHOTO_TEXT_MAX_BYTES) throw new PhotoOpenError();
    return { blob, url: URL.createObjectURL(blob), width, height };
  } finally {
    bitmap.close();
  }
}
