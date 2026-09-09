'use client';
import { useEffect, useRef, useState } from 'react';
import { todayKST } from '@/lib/dates';
import { toast } from 'sonner';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  COMPOSER_SAVED_EVENT,
  clearComposerDraft,
  readComposerDraft,
  writeComposerDraft,
  type ComposerDraft,
} from '@/lib/entries/composerDraft';

export function useComposerDraft(userId: string, selectedId: string | null) {
  const initial: ComposerDraft = {
    userId,
    selectedId,
    mode: 'quote',
    quote: '',
    note: '',
    isPrivate: false,
  };
  const [draft, setDraft] = useState(initial);
  const current = useRef(initial);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const active = useRef(false);
  useEffect(() => {
    const onSaved = (event: Event) => {
      const submitted = (event as CustomEvent<ComposerDraft>).detail;
      if (!active.current || JSON.stringify(current.current) !== JSON.stringify(submitted)) return;
      current.current = {
        ...current.current,
        quote: '',
        note: '',
        mode: 'quote',
        isPrivate: false,
        submission: undefined,
      };
      setDraft(current.current);
      toast.success('기록을 남겼어요.');
    };
    window.addEventListener(COMPOSER_SAVED_EVENT, onSaved);
    const {
      data: { subscription },
    } = createSupabaseClient().auth.onAuthStateChange((_event, session) => {
      const matches = session?.user.id === userId;
      if (!matches) {
        active.current = false;
        if (!session) clearComposerDraft();
        else {
          try {
            readComposerDraft(sessionStorage, session.user.id);
          } catch {
            /* Storage unavailable. */
          }
        }
        current.current = {
          userId,
          selectedId: null,
          mode: 'quote',
          quote: '',
          note: '',
          isPrivate: false,
        };
        setDraft(current.current);
        setReady(false);
        return;
      }
      if (!active.current) {
        let restored: ComposerDraft | null = null;
        try {
          restored = readComposerDraft(sessionStorage, userId);
        } catch {
          setStorageError(true);
        }
        if (restored) {
          current.current = restored;
          setDraft(restored);
        }
        active.current = true;
        setReady(true);
      }
    });
    return () => {
      active.current = false;
      window.removeEventListener(COMPOSER_SAVED_EVENT, onSaved);
      subscription.unsubscribe();
    };
  }, [userId]);
  function update(patch: Partial<Omit<ComposerDraft, 'userId'>>) {
    if (!active.current || current.current.submission) return;
    const next = { ...current.current, ...patch, userId };
    current.current = next;
    setDraft(next);
    try {
      writeComposerDraft(sessionStorage, next);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  // Persist the stable request ID before sending anything. React state alone cannot guard two clicks in one tick.
  function beginSubmission(bookTitle: string): ComposerDraft | null {
    if (!active.current) return null;
    if (current.current.submission) return current.current;
    let next: ComposerDraft;
    try {
      next = {
        ...current.current,
        submission: { id: crypto.randomUUID(), date: todayKST(), bookTitle },
      };
      writeComposerDraft(sessionStorage, next);
    } catch {
      setStorageError(true);
      return null;
    }
    current.current = next;
    setDraft(next);
    setStorageError(false);
    return next;
  }
  function releaseSubmission(submitted: ComposerDraft) {
    if (!active.current || current.current.submission?.id !== submitted.submission?.id) return;
    current.current = { ...current.current, submission: undefined };
    setDraft(current.current);
    try {
      writeComposerDraft(sessionStorage, current.current);
    } catch {
      setStorageError(true);
    }
  }
  function discard() {
    if (!active.current) return;
    current.current = {
      ...current.current,
      quote: '',
      note: '',
      mode: 'quote',
      isPrivate: false,
      submission: undefined,
    };
    setDraft(current.current);
    clearComposerDraft();
  }
  return {
    draft,
    update,
    discard,
    beginSubmission,
    releaseSubmission,
    ready,
    storageError,
    isActive: () => active.current,
  };
}
