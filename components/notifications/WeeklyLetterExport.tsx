'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useActionLock } from '@/hooks/useActionLock';
import { formatKoreanDate } from '@/lib/dates';
import { LIGHT_PALETTE } from '@/lib/share/palette';
import { paginateLetter, type LetterBlock } from '@/lib/export/weekly-letter';
import WeeklyLetterSheet, { LetterParagraph } from './WeeklyLetterSheet';
import type { WeeklyEntry } from './WeeklyTimeline';

type ImageFile = { file: File; url: string };
const measurementBlock: LetterBlock = {
  entryId: '',
  title: '',
  date: '2026-01-01',
  kind: 'quote',
  text: '',
  continued: false,
};

export default function WeeklyLetterExport({
  entries,
  period,
  onClose,
}: {
  entries: WeeklyEntry[];
  period: string;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [includeNotes, setIncludeNotes] = useState(true);
  const [stage, setStage] = useState<'choose' | 'generating' | 'preview'>('choose');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [canShareImages, setCanShareImages] = useState(false);
  const [download, setDownload] = useState<{ url: string; name: string } | null>(null);
  const [sheet, setSheet] = useState<{ blocks: LetterBlock[]; page: number; total: number } | null>(
    null
  );
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState('');
  const action = useActionLock();
  const heading = useRef<HTMLHeadingElement>(null);
  const measurement = useRef<HTMLDivElement>(null);
  const capture = useRef<HTMLDivElement>(null);
  const ownedUrls = useRef<string[]>([]);
  const generation = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    heading.current?.focus();
    return () => {
      alive.current = false;
      ownedUrls.current.forEach(URL.revokeObjectURL);
      ownedUrls.current = [];
    };
  }, []);

  function clearImages() {
    ownedUrls.current.forEach(URL.revokeObjectURL);
    ownedUrls.current = [];
    setImages([]);
    setDownload(null);
    setCanShareImages(false);
  }
  const eligible = (entry: WeeklyEntry) => Boolean(entry.quote || includeNotes || !entry.note);
  const chosen = entries.filter((entry) => selected.has(entry.id) && eligible(entry));
  const privateCount = chosen.filter((entry) => entry.is_private).length;

  async function generate() {
    if (!chosen.length || !action.acquire()) return;
    const run = ++generation.current;
    const next: ImageFile[] = [];
    const active = () => alive.current && run === generation.current;
    setMessage('');
    setStage('generating');
    setProgress('문장과 생각을 편지에 담고 있어요.');
    try {
      const { toBlob } = await import('html-to-image');
      // Load the exact export face even if selection UI has only used the sans face.
      for (const selector of ['[data-letter-text]', '[data-letter-title]']) {
        const font = getComputedStyle(measurement.current!.querySelector(selector)!).font;
        await document.fonts.load(font, '한 주의 독서 편지');
      }
      await document.fonts.ready;
      if (!active()) return;
      const blocks: LetterBlock[] = [];
      for (const entry of [...chosen].sort((a, b) => a.date.localeCompare(b.date))) {
        const base = {
          entryId: entry.id,
          title: entry.user_books.books?.title ?? '책 정보 없음',
          date: entry.date,
          continued: false,
        };
        if (entry.quote) blocks.push({ ...base, kind: 'quote', text: entry.quote });
        if (includeNotes && entry.note) blocks.push({ ...base, kind: 'note', text: entry.note });
        if (!entry.quote && !entry.note)
          blocks.push({ ...base, kind: 'reading', text: '읽은 분량을 기록했어요.' });
      }
      const target = measurement.current!;
      const pages = paginateLetter(blocks, (block) => {
        target.querySelector('[data-letter-meta]')!.textContent =
          `${formatKoreanDate(block.date)} · ${block.kind === 'quote' ? '책의 문장' : block.kind === 'note' ? '나의 생각' : '독서 기록'}${block.continued ? ' · 이어서' : ''}`;
        target.querySelector('[data-letter-title]')!.textContent = block.title;
        target.querySelector('[data-letter-text]')!.textContent = block.text;
        return Math.ceil(target.getBoundingClientRect().height);
      });
      for (let index = 0; index < pages.length; index++) {
        if (!active()) return;
        flushSync(() => {
          setSheet({ blocks: pages[index], page: index + 1, total: pages.length });
          setProgress(`${pages.length}장 중 ${index + 1}장을 만들고 있어요.`);
        });
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (!active()) return;
        const node = capture.current!;
        const body = node.querySelector('[data-letter-body]')!;
        if (body.scrollHeight > body.clientHeight + 1) throw new Error('content-too-tall');
        // Safari may omit web fonts on the first canvas; discard the warm-up.
        if (index === 0) await toBlob(node, { pixelRatio: 2, cacheBust: true });
        if (!active()) return;
        const blob = await toBlob(node, { pixelRatio: 2, cacheBust: true });
        if (!active()) return;
        if (!blob) throw new Error('capture-failed');
        const file = new File([blob], `readiary-letter-${index + 1}.png`, { type: 'image/png' });
        next.push({ file, url: URL.createObjectURL(file) });
      }
      if (!active()) return;
      const files = next.map((item) => item.file);
      let supported = false;
      try {
        supported =
          typeof navigator.share === 'function' && navigator.canShare?.({ files }) === true;
      } catch {
        /* Fall back to a file download. */
      }
      setProgress('편지를 저장할 파일로 묶고 있어요.');
      const { bundleLetterImages } = await import('@/lib/export/letter-download');
      const bundle = supported ? null : await bundleLetterImages(files);
      if (!active()) return;
      const downloadUrl = bundle
        ? next.length === 1
          ? next[0].url
          : URL.createObjectURL(bundle.blob)
        : null;
      clearImages();
      ownedUrls.current = [
        ...new Set([...next.map((item) => item.url), ...(downloadUrl ? [downloadUrl] : [])]),
      ];
      setCanShareImages(supported);
      if (bundle && downloadUrl) setDownload({ url: downloadUrl, name: bundle.name });
      setImages(next);
      setStage('preview');
      setSheet(null);
      requestAnimationFrame(() => heading.current?.focus());
    } catch (error) {
      if (active()) {
        const reason = error instanceof Error ? error.message : '';
        setMessage(
          reason === 'too-many-pages'
            ? '편지가 30장을 넘어요. 기록을 나누어 골라 주세요.'
            : reason === 'content-too-tall'
              ? '한 장에 담기 어려운 기록이 있어요. 선택한 기록을 줄여 다시 만들어 주세요.'
              : '이미지를 만들지 못했어요. 다시 시도해 주세요.'
        );
        setStage('choose');
        setSheet(null);
      }
    } finally {
      next
        .filter((item) => !ownedUrls.current.includes(item.url))
        .forEach((item) => URL.revokeObjectURL(item.url));
      if (alive.current) action.release();
    }
  }

  async function share() {
    if (!action.acquire()) return;
    setMessage('');
    try {
      const files = images.map((item) => item.file);
      if (!navigator.canShare?.({ files })) {
        setMessage('이미지 공유를 사용할 수 없어요. 다시 고르기에서 편지를 다시 만들어 주세요.');
        return;
      }
      await navigator.share({ files, title: '한 주의 독서 편지' });
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError')
        setMessage('공유창을 열지 못했어요. 다시 시도하거나 이미지를 길게 눌러 저장해 주세요.');
    } finally {
      if (alive.current) action.release();
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="letter-heading">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={action.busy && stage !== 'generating'}
          className="-ml-4"
        >
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" /> 기록으로 돌아가기
        </Button>
        <h2
          id="letter-heading"
          ref={heading}
          tabIndex={-1}
          className="mt-4 font-serif text-page-title focus:outline-none"
        >
          한 주의 독서 편지
        </h2>
        <p className="mt-2 text-body-sm text-ink-sub">
          {stage === 'preview'
            ? '편지에 담긴 내용을 확인하고 이미지로 간직하세요.'
            : '다시 읽고 싶은 문장과 생각을 골라 한 통의 편지로 간직하세요.'}
        </p>
      </div>
      {message && (
        <p role="alert" className="text-body-sm text-danger">
          {message}
        </p>
      )}
      {stage === 'choose' && (
        <>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body-sm">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(event) => setIncludeNotes(event.target.checked)}
              className="h-5 w-5 accent-accent"
            />{' '}
            나의 생각도 담기
          </label>
          <p className="text-caption text-ink-sub">
            고른 내용만 이미지에 담아요. 기록의 공개 범위는 바뀌지 않아요.
          </p>
          <fieldset className="min-w-0 border-y border-hairline">
            <legend className="sr-only">편지에 담을 기록</legend>
            {entries.map((entry) => (
              <label
                key={entry.id}
                className={`flex gap-3 border-b border-hairline py-5 last:border-0 ${eligible(entry) ? 'cursor-pointer' : 'opacity-50'}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(entry.id) && eligible(entry)}
                  disabled={!eligible(entry)}
                  onChange={(event) =>
                    setSelected((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(entry.id);
                      else next.delete(entry.id);
                      return next;
                    })
                  }
                  className="mt-1 h-5 w-5 shrink-0 accent-accent"
                />
                <span className="min-w-0 space-y-2">
                  <span className="block text-caption text-ink-sub">
                    {formatKoreanDate(entry.date)}
                    {entry.is_private ? ' · 비공개 기록' : ''}
                  </span>
                  <span className="block font-serif text-body font-semibold">
                    {entry.user_books.books?.title ?? '책 정보 없음'}
                  </span>
                  <span className="block line-clamp-3 whitespace-pre-wrap font-serif text-note">
                    {entry.quote || entry.note || '읽은 분량을 기록했어요.'}
                  </span>
                  {entry.quote && entry.note && includeNotes && (
                    <span className="block line-clamp-2 text-body-sm text-ink-sub">
                      나의 생각 · {entry.note}
                    </span>
                  )}
                  {!eligible(entry) && (
                    <span className="block text-caption text-ink-sub">
                      생각을 담으려면 ‘나의 생각도 담기’를 켜 주세요.
                    </span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>
          <div className="space-y-3">
            <p aria-live="polite" className="text-caption text-ink-sub">
              {chosen.length}개 선택
              {privateCount > 0 ? ` · 비공개 기록 ${privateCount}개도 이미지에 담겨요.` : ''}
            </p>
            <Button onClick={generate} disabled={!chosen.length || action.busy} fullWidth>
              독서 편지 만들기
            </Button>
            <p className="text-caption text-ink-sub">
              긴 내용은 다음 장으로 이어져요. 한 번에 최대 30장까지 만들 수 있어요.
            </p>
          </div>
        </>
      )}
      {stage === 'generating' && (
        <div className="border-y border-hairline py-12">
          <p role="status" className="font-serif text-body">
            {progress}
          </p>
          <p className="mt-3 text-caption text-ink-sub">
            완성된 이미지는 저장 전에 확인할 수 있어요.
          </p>
        </div>
      )}
      {stage === 'preview' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-body-sm">
              독서 편지 {images.length}장이 준비됐어요.
            </p>
            <Button
              variant="secondary"
              size="sm"
              disabled={action.busy}
              onClick={() => {
                clearImages();
                setStage('choose');
                setMessage('');
              }}
            >
              다시 고르기
            </Button>
          </div>
          <p className="text-caption text-ink-sub">
            {canShareImages
              ? '공유창에서 이미지 저장 또는 원하는 앱을 선택하세요. 저장 메뉴는 기기에 따라 달라요.'
              : images.length > 1
                ? `이미지 ${images.length}장을 ZIP 파일 하나로 저장해요. 압축을 풀면 각 이미지를 볼 수 있어요.`
                : '편지를 PNG 이미지로 저장해요.'}{' '}
            다른 사람에게 전달하면 이미지에 담긴 내용을 볼 수 있어요.
          </p>
          {canShareImages && (
            <Button onClick={share} disabled={action.busy} fullWidth>
              <Share2 size={16} strokeWidth={1.75} aria-hidden="true" /> 이미지 저장 · 공유
            </Button>
          )}
          {download && (
            <Button asChild fullWidth>
              <a href={download.url} download={download.name}>
                <Download size={16} strokeWidth={1.75} aria-hidden="true" /> 편지 전체 저장
              </a>
            </Button>
          )}
          <ol className="space-y-8">
            {images.map((item, index) => (
              <li key={item.url} className="space-y-3">
                {/* Browser-local generated PNG; never uploaded to an image service. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={`한 주의 독서 편지 ${index + 1} / ${images.length}장`}
                  width={1080}
                  height={1520}
                  className="h-auto w-full border border-hairline"
                  loading="lazy"
                />
              </li>
            ))}
          </ol>
        </>
      )}
      <div
        aria-hidden="true"
        inert
        style={{ position: 'fixed', left: -10000, top: 0, ...LIGHT_PALETTE }}
      >
        <div ref={measurement} style={{ width: 452 }}>
          <LetterParagraph block={measurementBlock} />
        </div>
        {sheet && <WeeklyLetterSheet ref={capture} {...sheet} period={period} />}
      </div>
    </section>
  );
}
