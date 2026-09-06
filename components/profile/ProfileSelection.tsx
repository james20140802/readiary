'use client';

import { useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import FormLabel from '@/components/ui/FormLabel';

export interface ProfileSelectionOption {
  id: string;
  title: string;
  subtitle?: string;
  groupId?: string;
}

interface Props {
  label: string;
  options: ProfileSelectionOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  emptyLabel: string;
  emptyMessage: string;
  searchPlaceholder: string;
  loading?: boolean;
  error?: boolean;
  disabled?: boolean;
  filterByBook?: boolean;
  selectedOption?: ProfileSelectionOption;
  remote?: {
    groups: [string, string][];
    onOpen: (open: boolean) => void;
    onSearch: (search: string) => void;
    onBook: (id: string) => void;
    page: number;
    hasNext: boolean;
    onPage: (page: number) => void;
    retry: () => void;
  };
}

export default function ProfileSelection({
  label,
  options,
  value,
  onChange,
  emptyLabel,
  emptyMessage,
  searchPlaceholder,
  loading,
  error,
  disabled,
  filterByBook,
  selectedOption,
  remote,
}: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [bookId, setBookId] = useState('');
  const selected =
    selectedOption?.id === value ? selectedOption : options.find((option) => option.id === value);
  const groups = remote?.groups ?? [
    ...new Map(
      options.filter((o) => o.groupId).map((o) => [o.groupId!, o.subtitle ?? '제목 없는 책'])
    ).entries(),
  ];
  const query = search.trim().normalize('NFKC').toLocaleLowerCase();
  const visible = remote
    ? options
    : options.filter(
        (option) =>
          (!bookId || option.groupId === bookId) &&
          `${option.title} ${option.subtitle ?? ''}`
            .normalize('NFKC')
            .toLocaleLowerCase()
            .includes(query)
      );

  function close() {
    setOpen(false);
    remote?.onOpen(false);
    trigger.current?.focus();
  }

  function select(next: string | null) {
    onChange(next);
    close();
  }

  return (
    <div className="mt-4 border-y border-hairline">
      <div className="flex items-start gap-4 py-4">
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="mb-2 text-caption text-ink-faint">현재 선택</p>
          <p className="whitespace-pre-wrap break-words font-serif text-[15px] leading-relaxed text-ink">
            {selected?.title ??
              (value
                ? loading
                  ? '선택한 항목을 불러오는 중…'
                  : '선택한 항목을 불러오지 못했습니다.'
                : emptyLabel)}
          </p>
          {selected?.subtitle && (
            <p className="mt-2 text-caption text-ink-sub">『{selected.subtitle}』</p>
          )}
        </div>
        <button
          ref={trigger}
          type="button"
          aria-label={`${label} ${open ? '선택 닫기' : '변경'}`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          disabled={disabled || (!remote && (loading || error))}
          onClick={() => {
            setOpen(!open);
            remote?.onSearch('');
            remote?.onBook('');
            remote?.onOpen(!open);
            setSearch('');
            setBookId('');
          }}
          className="flex min-h-11 shrink-0 items-center gap-1 px-2 text-caption font-semibold text-ink-sub hover:text-ink focus-visible:outline focus-visible:outline-accent disabled:opacity-50"
        >
          {open ? '닫기' : '변경'}
          <ChevronDown size={14} aria-hidden className={open ? 'rotate-180' : ''} />
        </button>
      </div>
      {loading && (
        <p role="status" className="pb-4 text-caption text-ink-faint">
          목록을 불러오는 중…
        </p>
      )}
      {error && (
        <p role="alert" className="pb-4 text-caption text-danger">
          {remote
            ? '목록을 불러오지 못했습니다. 다시 시도해 주세요.'
            : '목록을 불러오지 못했습니다. 페이지를 새로고침해 주세요.'}
        </p>
      )}
      {open && (
        <div
          id={`${id}-panel`}
          className="border-t border-hairline pb-4 pt-4"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              close();
            }
          }}
        >
          {remote || options.length > 0 ? (
            <>
              <FormLabel variant="line" htmlFor={`${id}-search`}>
                {label} 검색
              </FormLabel>
              <Input
                id={`${id}-search`}
                variant="line"
                type="search"
                autoFocus
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  remote?.onSearch(e.target.value);
                }}
                placeholder={searchPlaceholder}
                trailing={<Search size={16} aria-hidden className="text-ink-faint" />}
              />
              {filterByBook && (
                <div className="mt-4">
                  <FormLabel variant="line" htmlFor={`${id}-book`}>
                    책으로 좁히기
                  </FormLabel>
                  <select
                    id={`${id}-book`}
                    value={bookId}
                    onChange={(e) => {
                      setBookId(e.target.value);
                      remote?.onBook(e.target.value);
                    }}
                    className="min-h-11 w-full border-b border-hairline bg-paper py-2 text-sm text-ink focus-visible:outline focus-visible:outline-accent"
                  >
                    <option value="">모든 책</option>
                    {groups.map(([groupId, title]) => (
                      <option key={groupId} value={groupId}>
                        {title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <p role="status" className="my-3 text-caption text-ink-faint">
                {visible.length}개 · 선택하면 목록이 닫힙니다
              </p>
              <ul
                aria-label={`${label} 후보`}
                className="max-h-80 overflow-y-auto overscroll-contain divide-y divide-hairline"
              >
                {visible.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      disabled={disabled || loading || error}
                      aria-pressed={value === option.id}
                      onClick={() => select(option.id)}
                      className="flex min-h-12 w-full items-start gap-3 px-2 py-3 text-left hover:bg-card-raised focus-visible:outline focus-visible:outline-accent disabled:opacity-50"
                    >
                      <span className="mt-1 w-4 shrink-0 text-accent">
                        {value === option.id && <Check size={16} aria-hidden />}
                      </span>
                      <span className="min-w-0">
                        <span className="block whitespace-pre-wrap break-words font-serif text-[14px] leading-relaxed text-ink">
                          {option.title}
                        </span>
                        {option.subtitle && (
                          <span className="mt-1 block text-caption text-ink-faint">
                            『{option.subtitle}』
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {visible.length === 0 && !loading && !error && (
                <p className="py-4 text-sm text-ink-sub">
                  검색 결과가 없습니다. 검색어나 책을 바꿔 보세요.
                </p>
              )}
            </>
          ) : (
            <p className="py-3 text-sm text-ink-sub">{emptyMessage}</p>
          )}
          {remote && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={loading || disabled || remote.page === 0}
                onClick={() => remote.onPage(remote.page - 1)}
              >
                이전
              </Button>
              <span className="text-caption text-ink-faint">{remote.page + 1}쪽</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={loading || disabled || !remote.hasNext}
                onClick={() => remote.onPage(remote.page + 1)}
              >
                다음
              </Button>
              {error && (
                <Button variant="ghost" size="sm" onClick={remote.retry}>
                  재시도
                </Button>
              )}
            </div>
          )}
          <div className="mt-3 border-t border-hairline pt-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled || value === null}
              onClick={() => select(null)}
            >
              {emptyLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
