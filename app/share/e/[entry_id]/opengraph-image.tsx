import { readFile } from 'fs/promises';
import { join } from 'path';
import { ImageResponse } from 'next/og';
import { fetchPublicEntry } from '@/lib/share/fetchPublicEntry';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Readiary 문장 카드';

let fontDataPromise: Promise<Buffer> | null = null;

function loadMaruBuri(): Promise<Buffer> {
  fontDataPromise ??= readFile(join(process.cwd(), 'app', 'fonts', 'MaruBuri-Regular.woff'));
  return fontDataPromise;
}

export default async function OgImage({ params }: { params: Promise<{ entry_id: string }> }) {
  const { entry_id } = await params;
  const entry = await fetchPublicEntry(entry_id);
  if (!entry) return new Response('Not Found', { status: 404 });

  const fontData = await loadMaruBuri();

  const raw = entry.quote ?? entry.note ?? '';
  const display = raw.length > 110 ? `${raw.slice(0, 110)}…` : raw;
  const attribution = [entry.bookAuthor, `@${entry.nickname}`].filter(Boolean).join(' · ');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#F7F3EC',
          padding: '72px 80px',
          fontFamily: 'MaruBuri',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 40,
            lineHeight: 1.7,
            color: '#221E1A',
            wordBreak: 'keep-all',
          }}
        >
          {entry.quote ? `“${display}”` : display}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderTop: '1px solid #E3DCD0',
            paddingTop: 28,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', fontSize: 27, color: '#221E1A' }}>
              『{entry.bookTitle}』
            </div>
            {attribution && (
              <div style={{ display: 'flex', fontSize: 20, color: '#6E665C' }}>{attribution}</div>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 21,
              letterSpacing: '0.16em',
              color: '#A39A8D',
            }}
          >
            READIARY
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'MaruBuri', data: fontData, style: 'normal', weight: 400 }],
    }
  );
}
