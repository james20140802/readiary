import type { Box, PhotoText, PhotoWord } from './types';

const ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';
/** Vision이 이 안에 답하지 않으면 실패로 본다 */
const TIMEOUT_MS = 15_000;

/** 글자를 읽지 못했다 — Vision 실패, 시간 초과, 알 수 없는 응답. 응답 내용과 키는 메시지에 담지 않는다 */
export class PhotoReadError extends Error {
  constructor(reason: string) {
    super(`photo text read failed: ${reason}`);
    this.name = 'PhotoReadError';
  }
}

type Json = Record<string, unknown>;

function record(value: unknown): Json {
  return typeof value === 'object' && value !== null ? (value as Json) : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Vision `DOCUMENT_TEXT_DETECTION` 응답을 낱말 목록으로 정리한다. 낱말 순서는 Vision이 준 그대로다.
 * 마지막 글자의 `detectedBreak`가 HYPHEN이면 뒤에 아무것도 붙이지 않고(줄 끝에서 잘린 낱말),
 * 그 밖의 값이 있으면 띄어쓰기 한 칸, 없으면 붙여 쓴다.
 */
export function parseVision(json: unknown): PhotoText {
  const first = record(list(record(json).responses)[0]);
  if (first.error) throw new PhotoReadError('vision_response_error');

  const pages = list(record(first.fullTextAnnotation).pages);
  const page = record(pages[0]);
  const words: PhotoWord[] = [];

  for (const p of pages) {
    for (const block of list(record(p).blocks)) {
      for (const paragraph of list(record(block).paragraphs)) {
        for (const w of list(record(paragraph).words)) {
          const symbols = list(record(w).symbols).map(record);
          const text = symbols.map((s) => (typeof s.text === 'string' ? s.text : '')).join('');
          if (text === '') continue;
          const last = symbols[symbols.length - 1];
          const brk = record(record(last.property).detectedBreak).type;
          const vertices = list(record(record(w).boundingBox).vertices).map(record);
          const xs = vertices.map((v) => num(v.x));
          const ys = vertices.map((v) => num(v.y));
          const box: Box = vertices.length
            ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
            : [0, 0, 0, 0];
          words.push({ text, box, sep: brk === 'HYPHEN' || !brk ? '' : ' ' });
        }
      }
    }
  }

  return { width: num(page.width), height: num(page.height), words };
}

/** JPEG 바이트를 Vision에 보내 글자를 읽는다. 키는 헤더로만 보낸다 */
export async function readPhotoText(
  jpeg: Uint8Array,
  key: string,
  signal?: AbortSignal
): Promise<PhotoText> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  let json: unknown;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
      body: JSON.stringify({
        requests: [
          {
            image: { content: Buffer.from(jpeg).toString('base64') },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      cache: 'no-store',
    });
    if (!res.ok) throw new PhotoReadError(`vision_status_${res.status}`);
    json = await res.json();
  } catch (error) {
    if (error instanceof PhotoReadError) throw error;
    throw new PhotoReadError(error instanceof Error ? error.name : 'unknown');
  }
  return parseVision(json);
}
