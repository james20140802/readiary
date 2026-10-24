'use client';

import { useState } from 'react';
import ComposerView, {
  type ComposerMode,
  type ComposerSaved,
} from '@/components/today/ComposerView';
import type { MyBook } from '@/types/book';

export interface ComposerDemoProps {
  desk?: boolean;
  books: MyBook[];
  initial?: { mode?: ComposerMode; quote?: string; note?: string; isPrivate?: boolean };
  saved?: Omit<ComposerSaved, 'extraOpen' | 'extraText'> | null;
  pending?: boolean;
  saveError?: string | null;
}

/** 견본용 쓰기 — 초안·저장 대신 화면 안 상태만 바꾼다. 서버에 아무것도 보내지 않는다 */
export default function ComposerDemo({
  desk,
  books,
  initial,
  saved: savedInit = null,
  pending = false,
  saveError = null,
}: ComposerDemoProps) {
  const [mode, setMode] = useState<ComposerMode>(initial?.mode ?? 'quote');
  const [quote, setQuote] = useState(initial?.quote ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [isPrivate, setPrivate] = useState(initial?.isPrivate ?? false);
  const [selectedId, setSelectedId] = useState<string | null>(books[0]?.id ?? null);
  const [saved, setSaved] = useState(savedInit);
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraText, setExtraText] = useState('');
  const book = books.find((b) => b.id === selectedId);

  return (
    <ComposerView
      desk={desk}
      books={books}
      selectedId={selectedId}
      mode={mode}
      quote={quote}
      note={note}
      isPrivate={isPrivate}
      ready
      disabled={pending}
      canSave={!!book && Boolean(quote.trim() || note.trim())}
      pendingSubmission={pending}
      submitting={false}
      draftKept={Boolean(quote || note)}
      storageError={false}
      saveError={saveError}
      saved={saved ? { ...saved, extraOpen, extraText } : null}
      onChange={(f, v) => (f === 'quote' ? setQuote(v) : setNote(v))}
      onMode={setMode}
      onTogglePrivate={() => setPrivate((v) => !v)}
      onSelectBook={setSelectedId}
      onSave={() => {
        if (!book) return;
        setSaved({
          id: 'demo',
          mode: quote.trim() ? 'quote' : 'note',
          text: quote.trim() || note.trim(),
          bookTitle: book.books.title,
        });
        setQuote('');
        setNote('');
      }}
      onExtraOpen={() => setExtraOpen(true)}
      onExtraChange={setExtraText}
      onAddExtra={() => {
        setSaved(null);
        setExtraOpen(false);
        setExtraText('');
      }}
      onAddPages={() => {
        setSaved(null);
        return true;
      }}
      onAgain={() => {
        setSaved(null);
        setExtraOpen(false);
        setExtraText('');
        setMode('quote');
      }}
    />
  );
}
