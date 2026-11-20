// 임시 실험: 책 사진 OCR 비교 (Tesseract.js 기기 안 처리 vs Google Cloud Vision)
// 제품 코드가 아니다. 사진은 저장하지 않고 메모리에서만 다룬다.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3170;
const KEY_FILE = path.join(os.homedir(), '.config', 'readiary-ocr-spike', 'env');

function visionKey() {
  // 요청마다 읽는다: 키 파일을 나중에 만들어도 서버를 다시 띄울 필요가 없다.
  try {
    const line = fs
      .readFileSync(KEY_FILE, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('GOOGLE_VISION_API_KEY='));
    return line ? line.slice('GOOGLE_VISION_API_KEY='.length).trim() : '';
  } catch {
    return '';
  }
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

async function vision(base64) {
  const key = visionKey();
  if (!key) return { status: 503, body: { error: 'no_key' } };
  const started = Date.now();
  const r = await fetch('https://vision.googleapis.com/v1/images:annotate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({
      requests: [{ image: { content: base64 }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }],
    }),
  });
  const json = await r.json();
  const ms = Date.now() - started;
  if (!r.ok) return { status: 502, body: { error: 'vision_error', detail: json.error?.message ?? r.status } };
  const first = json.responses?.[0] ?? {};
  if (first.error) return { status: 502, body: { error: 'vision_error', detail: first.error.message } };
  const words = [];
  for (const page of first.fullTextAnnotation?.pages ?? []) {
    for (const block of page.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        for (const word of para.words ?? []) {
          const v = word.boundingBox?.vertices ?? [];
          const xs = v.map((p) => p.x ?? 0);
          const ys = v.map((p) => p.y ?? 0);
          words.push({
            text: (word.symbols ?? []).map((s) => s.text).join(''),
            brk: (word.symbols ?? []).at(-1)?.property?.detectedBreak?.type ?? '',
            box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
          });
        }
      }
    }
  }
  return { status: 200, body: { text: first.fullTextAnnotation?.text ?? '', words, ms } };
}

http
  .createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) {
        return send(res, 200, fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), 'text/html; charset=utf-8');
      }
      if (req.method === 'GET' && req.url === '/status') {
        return send(res, 200, { vision: Boolean(visionKey()) });
      }
      if (req.method === 'POST' && req.url === '/vision') {
        const chunks = [];
        let size = 0;
        for await (const c of req) {
          size += c.length;
          if (size > 12 * 1024 * 1024) return send(res, 413, { error: 'too_large' });
          chunks.push(c);
        }
        const { image } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const out = await vision(image);
        return send(res, out.status, out.body);
      }
      send(res, 404, { error: 'not_found' });
    } catch (e) {
      send(res, 500, { error: 'server_error', detail: String(e?.message ?? e) });
    }
  })
  .listen(PORT, '127.0.0.1', () => console.log(`ocr spike on http://127.0.0.1:${PORT}`));
