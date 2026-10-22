/**
 * 새 디자인 토대(일기장과 간지)를 한 화면에서 확인하는 미리보기 전용 견본.
 * 이 화면은 `redesign` → `main` 머지(설계 6절 9) 전에 지운다.
 * 프로덕션 배포(VERCEL_ENV=production)에서는 열리지 않는다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import PileDemo from './PileDemo';

export const metadata: Metadata = { title: '디자인 견본', robots: { index: false } };

const COLORS: { token: string; cls: string; light: string; dark: string }[] = [
  { token: 'paper', cls: 'bg-paper', light: '#F4F0E8', dark: '#1A1714' },
  { token: 'ink', cls: 'bg-ink', light: '#221E1A', dark: '#ECE5DA' },
  { token: 'ink-sub', cls: 'bg-ink-sub', light: '#6B645A', dark: '#B1A899' },
  { token: 'ink-faint', cls: 'bg-ink-faint', light: '#9E968A', dark: '#8E8476' },
  { token: 'hairline', cls: 'bg-hairline', light: '#E0D9CC', dark: '#2E2A25' },
  { token: 'accent', cls: 'bg-accent', light: '#2D5FB8', dark: '#85A9EC' },
  { token: 'margin', cls: 'bg-margin', light: '#8EA9DD', dark: '#4F6694' },
  { token: 'sheet', cls: 'bg-sheet', light: '#FBFAF6', dark: '#26231F' },
  { token: 'flag-yellow', cls: 'bg-flag-yellow', light: '#F2C94C', dark: '라이트와 같음' },
  { token: 'flag-pink', cls: 'bg-flag-pink', light: '#EE7A9A', dark: '라이트와 같음' },
  { token: 'flag-orange', cls: 'bg-flag-orange', light: '#F29648', dark: '라이트와 같음' },
  { token: 'flag-green', cls: 'bg-flag-green', light: '#68BE84', dark: '라이트와 같음' },
  { token: 'flag-blue', cls: 'bg-flag-blue', light: '#5C8CE8', dark: '라이트와 같음' },
  { token: 'flag-purple', cls: 'bg-flag-purple', light: '#9C80D6', dark: '라이트와 같음' },
];

const TYPES: { cls: string; size: string; serif?: boolean }[] = [
  { cls: 'text-page-title', size: '34px' },
  { cls: 'text-page-title-lg', size: '40px' },
  { cls: 'text-section-title', size: '26px' },
  { cls: 'text-quote', size: '25px', serif: true },
  { cls: 'text-quote-lg', size: '30px', serif: true },
  { cls: 'text-note', size: '19px', serif: true },
  { cls: 'text-body', size: '17px' },
  { cls: 'text-body-sm', size: '15px' },
  { cls: 'text-input', size: '18px' },
  { cls: 'text-button', size: '17px' },
  { cls: 'text-button-sm', size: '15px' },
  { cls: 'text-caption', size: '15px' },
  { cls: 'text-overline', size: '14px' },
  { cls: 'text-tab', size: '12px' },
  { cls: 'text-fine', size: '13px' },
];

const SAMPLE = '경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-sans text-overline text-ink-sub">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function DesignLabPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-sans text-page-title text-ink">디자인 견본</h1>
      <p className="mt-2 font-sans text-body-sm text-ink-sub">
        일기장과 간지의 색·글자·간지 재질을 한곳에서 확인하는 미리보기용 화면입니다.
      </p>

      <Section title="색">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {COLORS.map((c) => (
            <li key={c.token} className="flex items-center gap-3">
              <span
                className={`${c.cls} h-12 w-12 shrink-0 rounded-md border border-hairline-strong`}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="font-sans text-caption text-ink">{c.token}</div>
                <div className="font-mono text-fine text-ink-sub">
                  라이트 {c.light} · 다크 {c.dark}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="글자">
        <ul className="space-y-5">
          {TYPES.map((t) => (
            <li key={t.cls}>
              <div className="font-mono text-fine text-ink-faint">
                {t.cls} · {t.size}
              </div>
              <p className={`${t.cls} ${t.serif ? 'font-serif' : 'font-sans'} text-ink`}>
                {SAMPLE}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="버튼">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">남기기</Button>
          <Button size="sm" variant="secondary">
            생각 덧붙이기
          </Button>
          <Button size="md">남기기</Button>
          <Button size="md" variant="secondary">
            생각 덧붙이기
          </Button>
        </div>
      </Section>

      <Section title="입력">
        <Input variant="line" label="책 제목" placeholder="읽고 있는 책의 제목" />
      </Section>

      <Section title="간지 한 장">
        <div className="vellum rounded-md px-6 pb-4 pt-5">
          <div className="font-sans text-overline text-ink-sub">20일 전 · 9월 16일</div>
          <p className="mt-2.5 font-serif text-quote text-ink">{SAMPLE}</p>
          <p className="mt-2.5 font-sans text-caption text-ink-sub">에로스의 종말 · 한병철</p>
          <span className="mt-1 inline-block font-sans text-button-sm text-accent">
            지금의 생각 덧붙이기
          </span>
        </div>
      </Section>

      <Section title="간지 묶음">
        <PileDemo />
      </Section>
    </main>
  );
}
