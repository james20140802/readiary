'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Sheet from '@/components/ui/Sheet';
import EntryLayer from '@/components/entry/EntryLayer';
import ReflectionPile, { ReflectionLoadState } from '@/components/reflections/ReflectionPile';
import ShareEntrySheet from '@/components/entries/ShareEntrySheet';
import Switch from '@/components/entries/Switch';
import { FIELD_LABEL, LONG_FIELD } from '@/components/entries/fieldStyles';
import type { EntryReflection } from '@/lib/reflections/types';
import { VARIANTS, type EntryLabVariant } from './variants';

/*
 * 기록 한 장 견본 — 데이터를 가져오지 않는다(API·로그인 없음). 문구는 시안 entry-layer.html에서.
 * 오늘은 2026-10-06로 고정해 '20일 전'처럼 시안과 같은 말이 나오게 한다.
 * 좋아요·댓글은 소셜 영역 부품이라 여기서는 같은 자리에 정적인 모양만 둔다.
 */
const TODAY = '2026-10-06';

const BOOK = { id: 'lab-book', title: '에로스의 종말', author: '한병철' };

const FULL = {
  id: 'lab-entry',
  date: '2026-09-16',
  quote: '경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.',
  note: '가까워질수록 모르는 부분이 줄어드는 게 꼭 좋은 걸까.',
  from_page: 42,
  to_page: 42,
  is_private: false,
};

const thought = (id: string, at: string, body: string, isPrivate = true): EntryReflection => ({
  id,
  entry_id: 'lab-entry',
  body,
  is_private: isPrivate,
  created_at: at,
  updated_at: at,
});

// 맨 위가 가장 최근
const THOUGHTS: EntryReflection[] = [
  thought('t3', '2026-10-06T02:00:00Z', '모르는 채로 남겨 두는 것도 존중일지 모른다.'),
  thought('t2', '2026-09-18T11:00:00Z', '이 문장을 친구에게 보냈다.', false),
  thought(
    't1',
    '2026-09-17T13:00:00Z',
    '다시 읽으니 문턱이라는 말이 먼저 걸린다. 들어가려면 넘어야 하는 것, 그래서 들어갔다는 걸 알게 해 주는 것.'
  ),
];

function Reactions() {
  return (
    <>
      <div className="flex min-h-10 items-center gap-4 font-sans text-caption text-ink-faint">
        <span className="flex items-center gap-1.5">
          <Heart size={18} strokeWidth={1.75} aria-hidden /> 3
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle size={18} strokeWidth={1.75} aria-hidden /> 2
        </span>
      </div>
      {[
        ['윤서', '나도 이 책에서 이 문장에 멈췄어.'],
        ['도현', '환상이 사라지는 게 꼭 나쁜 건 아닌 듯.'],
      ].map(([who, text]) => (
        <div key={who} className="border-t border-hairline py-3.5">
          <b className="font-sans text-[15px] font-semibold">{who}</b>
          <p className="mt-1 font-serif text-[17px] leading-[1.55]">{text}</p>
        </div>
      ))}
      <p className="border-t border-hairline pt-3 font-sans text-fine text-ink-faint">
        (견본: 좋아요·댓글은 소셜 부품이 그린다)
      </p>
    </>
  );
}

export default function EntryLab({ variant }: { variant: EntryLabVariant }) {
  const [menu, setMenu] = useState(false);
  const [share, setShare] = useState(false);
  const [del, setDel] = useState(false);
  const [write, setWrite] = useState(false);
  const [privateThought, setPrivateThought] = useState(true);

  const entry =
    variant === 'quote'
      ? { ...FULL, note: null }
      : variant === 'note'
        ? { ...FULL, quote: null, from_page: null, to_page: null }
        : variant === 'private'
          ? { ...FULL, is_private: true }
          : FULL;
  const friend = variant === 'friend';
  const items =
    variant === 'empty' || variant === 'loading' || variant === 'error'
      ? []
      : variant === 'quote'
        ? THOUGHTS.slice(1, 2)
        : friend
          ? THOUGHTS.filter((t) => !t.is_private)
          : THOUGHTS;
  const canShare = !friend && !entry.is_private;

  const reflections =
    variant === 'loading' || variant === 'error' ? (
      <ReflectionLoadState
        loading={variant === 'loading'}
        hasPage={false}
        error={variant === 'error' ? '이어 남긴 생각을 불러오지 못했습니다.' : ''}
        onRetry={() => {}}
      />
    ) : (
      <ReflectionPile
        items={items}
        entryDate={entry.date}
        today={TODAY}
        canWrite={!friend}
        entryIsPrivate={entry.is_private}
        onEdit={() => setWrite(true)}
        onDelete={() => {}}
        emptyText={friend ? '덧붙인 생각이 아직 없어요.' : '다시 읽으니 어떤 생각이 드나요?'}
        addAction={
          friend ? undefined : (
            <Button size="sm" onClick={() => setWrite(true)}>
              지금의 생각 덧붙이기
            </Button>
          )
        }
      />
    );

  return (
    <>
      <EntryLayer
        entry={entry}
        book={BOOK}
        bookUrl="/design-lab/entry/excerpts"
        isFriend={friend}
        back={{ href: '/design-lab', label: '견본' }}
        today={TODAY}
        onShare={canShare ? () => setShare(true) : undefined}
        onMore={friend ? undefined : () => setMenu(true)}
        reflections={reflections}
        reactions={<Reactions />}
      />

      <nav aria-label="견본 고르기" className="px-6 pb-40 pt-10 lg:pl-20">
        <p className="font-sans text-overline text-ink-sub">견본 상태</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {VARIANTS.map((v) => (
            <li key={v.key}>
              <Link
                href={`?v=${v.key}`}
                aria-current={v.key === variant ? 'page' : undefined}
                className="font-sans text-button-sm text-accent aria-[current=page]:text-ink"
              >
                {v.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Sheet open={menu} onClose={() => setMenu(false)} ariaLabel="기록 메뉴">
        <div className="-mt-3 font-sans text-[17px] font-medium">
          {['공유하기', '원문 고치기'].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setMenu(false)}
              className="flex min-h-[54px] w-full items-center border-t border-hairline text-left first:border-t-0"
            >
              {l}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              setDel(true);
            }}
            className="flex min-h-[54px] w-full items-center border-t border-hairline text-left text-danger"
          >
            지우기
          </button>
        </div>
      </Sheet>

      <ShareEntrySheet
        open={share}
        onClose={() => setShare(false)}
        entryId={entry.id}
        quote={entry.quote}
        note={entry.note}
        date={entry.date}
        bookTitle={BOOK.title}
        bookAuthor={BOOK.author}
      />

      <Modal ariaLabel="이 기록을 지울까요" isOpen={del} onClose={() => setDel(false)}>
        <h2 className="font-sans text-[18px] font-bold text-ink">이 기록을 지울까요</h2>
        <p className="mt-2 font-serif text-[17px] leading-[1.6] text-ink-sub">
          덧붙인 생각 3개도 함께 지워지고 되돌릴 수 없어요.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setDel(false)}>
            그대로 두기
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => setDel(false)}>
            지우기
          </Button>
        </div>
      </Modal>

      {/* 쓰기 시트의 모양 — 실제로는 ReflectionComposer가 그린다(로그인이 필요해 여기선 같은 모양만) */}
      <Sheet open={write} onClose={() => setWrite(false)} title="20일 뒤, 오늘의 생각">
        <p className="font-serif text-[16px] leading-[1.6] text-ink-sub">{FULL.quote}</p>
        <form className="mt-4" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="lab-refl" className={FIELD_LABEL}>
            지금 다시 읽으니
          </label>
          <textarea
            id="lab-refl"
            rows={3}
            placeholder="그때와 무엇이 달라졌나요"
            className={`${LONG_FIELD} min-h-24`}
          />
          <p className="mt-1 text-right font-mono text-[13px] text-ink-faint">0 / 10,000</p>
          <div className="mt-2 flex min-h-[54px] items-center gap-3 border-y border-hairline font-sans text-[17px] font-medium text-ink">
            <span id="lab-refl-private">이 생각만 나만 보기</span>
            <Switch
              checked={privateThought}
              labelledBy="lab-refl-private"
              onChange={setPrivateThought}
            />
          </div>
          <p className="mt-2 font-sans text-caption text-ink-sub">
            {privateThought ? '나만 볼 수 있어요.' : '친구가 볼 수 있어요.'} 쓰다 닫아도 이 기기에
            남아 있어요.
          </p>
          <div className="mt-[18px] flex">
            <Button type="submit" className="flex-1" onClick={() => setWrite(false)}>
              덧붙이기
            </Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
