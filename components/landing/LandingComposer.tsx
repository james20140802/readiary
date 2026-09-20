'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import Seal from '@/components/ui/Seal';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import ExcerptBooklet from '@/components/books/ExcerptBooklet';
import SlideHeading from './SlideHeading';
import { SlideBody } from './Slide';
import { COMPOSER_DEMO, SHELF_DEMO } from './demo';

const BOOKS = SHELF_DEMO.filter((book) =>
  [COMPOSER_DEMO.bookTitle, COMPOSER_DEMO.otherBookTitle].includes(book.title)
);
const DEMO_DATE = '2026-09-20';
type Field = 'quote' | 'note' | 'page';

/** 직접 입력하고 결과와 발췌집까지 보는 샘플. 네트워크·계정 저장 없이 이 화면에서만 유지한다. */
export default function LandingComposer() {
  const [view, setView] = useState<'compose' | 'saved' | 'booklet'>('compose');
  const [quote, setQuote] = useState(COMPOSER_DEMO.quote);
  const [note, setNote] = useState('');
  const [page, setPage] = useState('');
  const [book, setBook] = useState(BOOKS[0]);
  const [mode, setMode] = useState<'quote' | 'note'>('quote');
  const [isPrivate, setIsPrivate] = useState(false);
  const [editing, setEditing] = useState<Field | null>(null);
  const [draft, setDraft] = useState('');
  const previousViewRef = useRef(view);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (previousViewRef.current === view) return;
    previousViewRef.current = view;
    if (view !== 'compose') resultRef.current?.focus({ preventScroll: true });
    else
      containerRef.current
        ?.querySelector<HTMLTextAreaElement>('textarea')
        ?.focus({ preventScroll: true });
  }, [view]);

  useEffect(() => {
    if (editing)
      containerRef.current
        ?.querySelector<HTMLElement>('[data-demo-editor] input, [data-demo-editor] textarea')
        ?.focus({ preventScroll: true });
  }, [editing]);

  const edit = (field: Field, trigger: HTMLButtonElement) => {
    editTriggerRef.current = trigger;
    setDraft(field === 'quote' ? quote : field === 'note' ? note : page);
    setEditing(field);
  };
  const finishEditing = () => {
    setEditing(null);
    editTriggerRef.current?.focus({ preventScroll: true });
  };
  const fieldLabel =
    editing === 'page' ? '쪽수 (선택)' : editing === 'note' ? '나의 생각' : '책의 문장';

  return (
    <div ref={containerRef}>
      <SlideHeading
        eyebrow="문장"
        title="옮겨 적는 것으로 충분해요"
        body="길게 쓰지 않아도 됩니다. 오늘 마음에 남은 문장 하나가 기록의 시작이에요. 생각이 이어지면 그때 덧붙이면 됩니다."
      />
      <SlideBody className="mt-8">
        <p id="landing-demo-notice" className="mb-3 text-caption text-ink-sub">
          샘플 체험이에요. 입력한 내용은 계정에 저장되지 않고, 새로고침하면 사라져요.
        </p>
        {view === 'compose' ? (
          <Card hoverable={false}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (quote.trim() || note.trim()) setView('saved');
              }}
            >
              <Textarea
                id="landing-demo-entry"
                label={mode === 'quote' ? '책의 문장' : '나의 생각'}
                aria-describedby="landing-demo-notice"
                variant="line"
                fullWidth
                rows={3}
                maxLength={3000}
                className="font-serif"
                value={mode === 'quote' ? quote : note}
                onChange={(event) =>
                  mode === 'quote' ? setQuote(event.target.value) : setNote(event.target.value)
                }
                placeholder={
                  mode === 'quote'
                    ? '마음에 남은 문장을 옮겨 적어 보세요'
                    : '떠오른 생각을 남겨 보세요'
                }
              />
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                {BOOKS.map((candidate) => (
                  <Chip
                    key={candidate.id}
                    selected={book.id === candidate.id}
                    aria-pressed={book.id === candidate.id}
                    dot={book.id === candidate.id}
                    onClick={() => setBook(candidate)}
                  >
                    {candidate.title}
                  </Chip>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
                <Chip
                  selected={mode === 'quote'}
                  aria-pressed={mode === 'quote'}
                  onClick={() => setMode('quote')}
                >
                  문장
                </Chip>
                <Chip
                  selected={mode === 'note'}
                  aria-pressed={mode === 'note'}
                  onClick={() => setMode('note')}
                >
                  생각
                </Chip>
                <Chip
                  selected={isPrivate}
                  aria-pressed={isPrivate}
                  onClick={() => setIsPrivate((value) => !value)}
                >
                  <Lock size={12} strokeWidth={1.75} aria-hidden />
                  비공개
                </Chip>
                <Button
                  type="submit"
                  size="sm"
                  className="ml-auto"
                  disabled={!quote.trim() && !note.trim()}
                >
                  남기기
                </Button>
              </div>
            </form>
          </Card>
        ) : view === 'saved' ? (
          <div>
            <h3
              ref={resultRef}
              tabIndex={-1}
              className="mb-4 font-serif text-section-title text-ink focus:outline-none"
            >
              샘플 기록을 남겼어요
            </h3>
            <article className="border-y border-hairline py-5">
              <Seal>{isPrivate ? '비공개 · 샘플' : '친구 공개 · 샘플'}</Seal>
              {page && <p className="mt-2 text-caption text-ink-sub">{page}쪽</p>}
              {quote.trim() && (
                <blockquote className="mt-3 whitespace-pre-wrap break-words font-serif text-quote text-ink">
                  {quote.trim()}
                </blockquote>
              )}
              {note.trim() && (
                <p className="mt-3 whitespace-pre-wrap break-words font-serif text-note text-ink-sub">
                  {note.trim()}
                </p>
              )}
              <p className="mt-3 text-caption text-ink-sub">
                {book.title} · {book.author}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Chip onClick={(event) => edit('quote', event.currentTarget)}>
                  {quote.trim() ? '문장 수정' : '문장 덧붙이기'}
                </Chip>
                <Chip onClick={(event) => edit('note', event.currentTarget)}>
                  {note.trim() ? '생각 수정' : '생각 덧붙이기'}
                </Chip>
                <Chip onClick={(event) => edit('page', event.currentTarget)}>
                  {page ? '쪽수 수정' : '페이지 남기기'}
                </Chip>
              </div>
              {editing && (
                <form
                  data-demo-editor
                  className="mt-5"
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      finishEditing();
                    }
                  }}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (editing === 'page') setPage(draft ? String(Number(draft)) : '');
                    else if (editing === 'quote') setQuote(draft);
                    else setNote(draft);
                    finishEditing();
                  }}
                >
                  {editing === 'page' ? (
                    <Input
                      label={fieldLabel}
                      variant="line"
                      type="number"
                      min={1}
                      max={1000000}
                      step={1}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                    />
                  ) : (
                    <Textarea
                      id="landing-demo-addition"
                      label={fieldLabel}
                      fullWidth
                      variant="line"
                      rows={3}
                      maxLength={3000}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                    />
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        editing !== 'page' &&
                        !draft.trim() &&
                        !(editing === 'quote' ? note.trim() : quote.trim())
                      }
                    >
                      반영하기
                    </Button>
                    <Button size="sm" variant="ghost" onClick={finishEditing}>
                      취소
                    </Button>
                  </div>
                </form>
              )}
            </article>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  setEditing(null);
                  setView('booklet');
                }}
              >
                내 샘플 발췌집 보기
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(null);
                  setView('compose');
                }}
              >
                입력으로 돌아가기
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <h3
              ref={resultRef}
              tabIndex={-1}
              className="mb-4 font-serif text-section-title text-ink focus:outline-none"
            >
              내가 남긴 문장으로 만든 발췌집
            </h3>
            <p className="mb-5 text-caption text-ink-sub">
              실제 내 책장에서는 완독한 책의 문장들을 발췌집으로 만나게 돼요.
            </p>
            {quote.trim() ? (
              <div className="break-words">
                <ExcerptBooklet
                  bookTitle={book.title}
                  author={book.author}
                  quotes={[{ id: 'landing-entry', date: DEMO_DATE, quote: quote.trim() }]}
                  entryDates={[DEMO_DATE]}
                />
              </div>
            ) : (
              <p className="border-y border-hairline py-8 font-serif text-body text-ink-sub">
                생각은 샘플 기록에 남아 있어요. 발췌집에 담을 책의 문장도 덧붙여 보세요.
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setView('saved')}>
                샘플 기록으로 돌아가기
              </Button>
              <Button asChild>
                <Link href="/signup">가입하고 내 기록 남기기</Link>
              </Button>
            </div>
          </div>
        )}
      </SlideBody>
    </div>
  );
}
