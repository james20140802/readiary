import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhotoReadError, parseVision, readPhotoText } from '../vision';

const sym = (text: string, type?: string) =>
  type ? { text, property: { detectedBreak: { type } } } : { text };
const word = (symbols: unknown[], vertices: unknown[]) => ({
  symbols,
  boundingBox: { vertices },
});
const box = (x0: number, y0: number, x1: number, y1: number) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];
const annotated = (words: unknown[]) => ({
  responses: [
    {
      fullTextAnnotation: {
        pages: [{ width: 1500, height: 2000, blocks: [{ paragraphs: [{ words }] }] }],
      },
    },
  ],
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseVision', () => {
  it('낱말마다 글자, 상자, 뒤에 붙일 글자를 돌려준다', () => {
    const result = parseVision(
      annotated([
        word([sym('책'), sym('을', 'SPACE')], box(412, 388, 470, 421)),
        word([sym('읽'), sym('는', 'EOL_SURE_SPACE')], box(480, 388, 540, 421)),
        word([sym('일', 'LINE_BREAK')], box(100, 430, 130, 460)),
        word([sym('well', 'HYPHEN')], box(10, 500, 60, 530)),
        word([sym('다')], box(70, 500, 90, 530)),
      ])
    );
    expect(result.width).toBe(1500);
    expect(result.height).toBe(2000);
    expect(result.words).toEqual([
      { text: '책을', box: [412, 388, 470, 421], sep: ' ' },
      { text: '읽는', box: [480, 388, 540, 421], sep: ' ' },
      { text: '일', box: [100, 430, 130, 460], sep: ' ' },
      { text: 'well', box: [10, 500, 60, 530], sep: '' },
      { text: '다', box: [70, 500, 90, 530], sep: '' },
    ]);
  });

  it('기울어진 상자는 네 꼭짓점을 감싸고, 빠진 좌표는 0으로 본다', () => {
    const result = parseVision(
      annotated([
        word([sym('가')], [{ y: 12 }, { x: 40, y: 10 }, { x: 42, y: 30 }, { x: 2, y: 32 }]),
      ])
    );
    expect(result.words[0].box).toEqual([0, 10, 42, 32]);
  });

  it('글자가 없는 사진은 낱말 0개다', () => {
    expect(parseVision({ responses: [{}] })).toEqual({ width: 0, height: 0, words: [] });
    expect(parseVision({})).toEqual({ width: 0, height: 0, words: [] });
  });

  it('글자가 비어 있는 낱말은 버린다', () => {
    expect(parseVision(annotated([word([], box(0, 0, 1, 1))])).words).toEqual([]);
  });

  it('Vision이 응답 안에 오류를 담으면 실패다', () => {
    expect(() => parseVision({ responses: [{ error: { message: 'bad image' } }] })).toThrow(
      PhotoReadError
    );
  });
});

describe('readPhotoText', () => {
  it('키는 헤더로만 보내고 사진은 base64로 싣는다', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      void url;
      void init;
      return Response.json(annotated([word([sym('가')], box(0, 0, 1, 1))]));
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await readPhotoText(new Uint8Array([255, 216, 255]), 'secret-key');

    expect(result.words).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://vision.googleapis.com/v1/images:annotate');
    expect(String(url)).not.toContain('secret-key');
    expect(new Headers(init?.headers).get('X-Goog-Api-Key')).toBe('secret-key');
    const body = JSON.parse(String(init?.body));
    expect(body.requests).toHaveLength(1);
    expect(body.requests[0].features).toEqual([{ type: 'DOCUMENT_TEXT_DETECTION' }]);
    expect(body.requests[0].image.content).toBe(Buffer.from([255, 216, 255]).toString('base64'));
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('Vision이 실패 상태를 주면 응답 내용을 담지 않은 오류를 던진다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ error: { message: 'API key secret-key invalid' } }, { status: 403 })
      )
    );
    const error = await readPhotoText(new Uint8Array([1]), 'secret-key').catch((e) => e);
    expect(error).toBeInstanceOf(PhotoReadError);
    expect(String(error.message)).not.toContain('secret-key');
  });

  it('연결이 끊기거나 시간이 넘어도 같은 오류다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('timeout', 'TimeoutError');
      })
    );
    await expect(readPhotoText(new Uint8Array([1]), 'k')).rejects.toBeInstanceOf(PhotoReadError);
  });

  it('JSON이 아닌 응답도 같은 오류다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>', { status: 200 }))
    );
    await expect(readPhotoText(new Uint8Array([1]), 'k')).rejects.toBeInstanceOf(PhotoReadError);
  });
});
