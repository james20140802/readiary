import type { SearchBook, SearchTab } from './types';
export interface SearchDraft {
  query: string;
  tab: SearchTab;
  book: SearchBook | null;
  from: string;
  to: string;
  filtersOpen: boolean;
  scroll: number;
}
export const emptyDraft: SearchDraft = {
  query: '',
  tab: 'all',
  book: null,
  from: '',
  to: '',
  filtersOpen: false,
  scroll: 0,
};
let owner: string | null = null;
let draft = { ...emptyDraft };
const pages = new Map<string, unknown>();
export function setSearchOwner(id: string | null) {
  if (owner !== id || id === null) {
    pages.clear();
    draft = { ...emptyDraft };
  }
  owner = id;
}
export function readSearchDraft(id: string): SearchDraft {
  if (typeof window === 'undefined') return { ...emptyDraft };
  if (owner !== id) setSearchOwner(id);
  return draft;
}
export function saveSearchDraft(id: string, value: SearchDraft) {
  if (owner === id) draft = value;
}
export function readSearchPage<T>(id: string, key: string): T | undefined {
  return owner === id ? (pages.get(key) as T | undefined) : undefined;
}
export function saveSearchPage<T>(id: string, key: string, value: T) {
  if (owner === id) pages.set(key, value);
}
