import { isEntrySubmission, type EntrySubmission } from './saveRequest';
/** One draft per tab. Never sent to a server before the reader saves it. */
export const COMPOSER_DRAFT_KEY = 'readiary:composer-draft:v1';
export const COMPOSER_SAVED_EVENT = 'readiary:composer-saved';
export interface ComposerDraft {
  userId: string;
  selectedId: string | null;
  mode: 'quote' | 'note';
  quote: string;
  note: string;
  isPrivate: boolean;
  submission?: EntrySubmission;
}
export function readComposerDraft(storage: Storage, userId: string): ComposerDraft | null {
  const raw = storage.getItem(COMPOSER_DRAFT_KEY);
  if (!raw) return null;
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    storage.removeItem(COMPOSER_DRAFT_KEY);
    return null;
  }
  {
    if (
      value?.userId !== userId ||
      !(value.selectedId === null || typeof value.selectedId === 'string') ||
      !['quote', 'note'].includes(value.mode) ||
      typeof value.quote !== 'string' ||
      typeof value.note !== 'string' ||
      typeof value.isPrivate !== 'boolean' ||
      (value.submission !== undefined &&
        (!isEntrySubmission(value.submission) ||
          !value.selectedId ||
          (!value.quote.trim() && !value.note.trim())))
    ) {
      storage.removeItem(COMPOSER_DRAFT_KEY);
      return null;
    }
    return value;
  }
}
export function writeComposerDraft(storage: Storage, draft: ComposerDraft): void {
  if (!draft.quote && !draft.note) storage.removeItem(COMPOSER_DRAFT_KEY);
  else storage.setItem(COMPOSER_DRAFT_KEY, JSON.stringify(draft));
}
export function clearComposerDraft(): void {
  try {
    sessionStorage.removeItem(COMPOSER_DRAFT_KEY);
  } catch {
    /* Storage can be disabled. */
  }
}

/** A request may finish after navigation. Only remove the exact submitted draft. */
export function clearSubmittedComposerDraft(submitted: ComposerDraft): void {
  try {
    const stored = JSON.parse(sessionStorage.getItem(COMPOSER_DRAFT_KEY) ?? 'null');
    if (stored && JSON.stringify(stored) === JSON.stringify(submitted)) {
      clearComposerDraft();
      if (typeof window !== 'undefined')
        window.dispatchEvent(new CustomEvent(COMPOSER_SAVED_EVENT, { detail: submitted }));
    }
  } catch {
    /* The active form reports storage failures. */
  }
}
