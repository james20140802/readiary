import Link from 'next/link';
import clsx from 'clsx';
import Button from '@/components/ui/Button';
import LandingWritingPad from './LandingWritingPad';
import LandingAgainStage from './LandingAgainStage';
import LandingFooter from './LandingFooter';
import s from './landing.module.css';

// 시안 .ctas .btn — 54px 높이, 좌우 28px. Button의 기본 여백보다 앞서야 해서 important로 덮는다
const CTA = 'min-h-[54px] !px-7';

const FAN = [
  { q: '사랑에 빠지는 일은 상대를 다 알기 전에 시작된다.', k: 'p.12' },
  { q: '오해도 이해의 한 방식이다.', k: 'p.58' },
  { q: '기억은 늘 조금씩 이야기를 고쳐 쓴다.', k: 'p.203' },
  { q: '끝은 대개 처음에 이미 적혀 있다.', k: 'p.240' },
] as const;

const MONTHS = [
  { cls: s.m1, m: '3월', q: '첫 기록. 정의란 무엇인가 1쪽.' },
  { cls: s.m2, m: '5월', q: '사랑은 가지는 것이 아니라 하는 것이다.' },
  { cls: s.m3, m: '9월', q: '경계와 문턱이 사라짐과 동시에…' },
  { cls: s.m4, m: '10월', q: '가진 것을 잃을까 두려운 마음이…' },
] as const;

/**
 * 랜딩 — 겹쳐 비치는 트레이싱지 묶음이 장면마다 다르게 쌓인다.
 * 표지 위 문장 간지 → 쓰는 장면 → 지난 문장 위에 얹히는 생각 → 부채처럼 펼쳐지는 발췌집 →
 * 친구의 문장에 걸친 답 → 한 해의 일기장 → 시작. 그림은 모두 장식이라 보조기기에는 감추고
 * 제목·문단이 내용을 전한다. 시안: docs/design/concept-2026-10/landing.html
 */
export default function Landing() {
  return (
    <div className={s.root}>
      <section className={clsx(s.sec, s.heroSec)} aria-labelledby="landing-title">
        <div className={clsx(s.in, s.hero)}>
          <div>
            <h1 id="landing-title" className={s.h1}>
              읽은 자리에
              <br />한 장 겹쳐 두세요
            </h1>
            <p className={s.lead}>
              마음에 남은 문장을 적어 두면, 한 달 뒤에도 일 년 뒤에도 그 자리에서 다시 만나요.
            </p>
            <div className={s.ctas}>
              <Button asChild size="lg" className={CTA}>
                <Link href="/signup">기록 시작하기</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className={CTA}>
                <a href="#look">둘러보기</a>
              </Button>
            </div>
          </div>
          <div className={s.hstage} aria-hidden="true">
            <div className={s.cover}>
              <div className={s.by}>읽는 사람</div>
              <div className={s.ti}>생각의 깊이</div>
              <div className={s.ft}>p.87</div>
            </div>
            <div className={clsx(s.v, s.ha)}>
              <div className={s.k}>2025. 10. 6. p.87</div>
              <div className={s.q}>생각이 깊어진다는 것은 무엇을 내려놓을지 알게 되는 일이다.</div>
            </div>
            <div className={clsx(s.v, s.hb)}>
              <div className={s.k}>1년 뒤, 오늘</div>
              <div className={s.s}>
                올해는 조금 더 내려놓았다. 내려놓은 자리에 다른 책이 들어왔다.
              </div>
            </div>
            <div className={clsx(s.v, s.hc)}>
              <div className={s.k}>윤서의 문장</div>
              <div className={s.s}>질문을 바꾸면 같은 하루도 다른 얼굴을 한다.</div>
            </div>
          </div>
        </div>
      </section>

      <section id="look" className={s.sec} aria-labelledby="landing-write">
        <div className={clsx(s.in, s.write)}>
          <div>
            <h2 id="landing-write" className={s.h2}>
              책을 덮기 전에,
              <br />한 줄
            </h2>
            <p className={s.lead}>
              책의 문장이든 나의 생각이든 하나만 있어도 돼요. 쪽수를 몰라도, 전자책이어도 괜찮아요.
            </p>
            <div className={s.notes}>
              <span>문장이나 생각 하나</span>
              <span>쪽수는 선택</span>
              <span>원고지 필사도</span>
            </div>
          </div>
          <LandingWritingPad />
        </div>
      </section>

      <section className={s.again} aria-labelledby="landing-again">
        <div className={s.pin}>
          <div className={s.copyStack}>
            <div className={s.t1}>
              <h2 id="landing-again" className={s.h2}>
                지난 문장이
                <br />
                오늘 다시 찾아와요
              </h2>
              <p className={s.lead}>
                1년 전 오늘 남긴 문장, 오래 잊고 있던 문장이 조용히 돌아와요.
              </p>
            </div>
            <div className={s.t2}>
              <h3 className={s.h2}>
                그때와 지금의 생각이
                <br />한 장씩 겹쳐요
              </h3>
              <p className={s.lead}>
                다시 읽은 날의 생각을 덧붙이면, 그 위에 트레이싱지처럼 한 장이 더 얹혀요.
              </p>
            </div>
          </div>
          <LandingAgainStage />
        </div>
      </section>

      <section className={s.sec} aria-labelledby="landing-excerpt">
        <div className={clsx(s.in, s.fan)}>
          <div className={s.copy}>
            <h2 id="landing-excerpt" className={s.h2}>
              다 읽으면,
              <br />한 권의 발췌집
            </h2>
            <p className={s.lead}>
              옮겨 적은 문장이 한 장씩 묶여요. 넘겨 읽고, 카드로 꺼내 보낼 수도 있어요.
            </p>
          </div>
          <div className={s.fstage} aria-hidden="true">
            {FAN.map((c) => (
              <div key={c.k} className={s.v}>
                <div className={s.q}>{c.q}</div>
                <div className={s.k}>{c.k}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={s.sec} aria-labelledby="landing-friends">
        <div className={clsx(s.in, s.talk)}>
          <div className={s.tstage} aria-hidden="true">
            <p className={s.ask}>가까워질수록 상대를 덜 궁금해하게 되는 걸까요?</p>
            <p className={s.tline}>
              경계와 문턱이 사라짐과 동시에 <mark>타자에 대한 환상</mark>도 사라진다.
            </p>
            <div className={clsx(s.v, s.reply)}>
              <div className={s.who}>도현</div>
              <div className={s.s2}>환상이 사라져야 진짜 그 사람이 보인다고 읽었어요.</div>
            </div>
          </div>
          <div className={s.copy}>
            <h2 id="landing-friends" className={s.h2}>
              같은 문장,
              <br />
              다르게 읽기
            </h2>
            <p className={s.lead}>
              친구가 남긴 문장과 생각을 읽고, 마음이 걸린 자리에 내 생각을 답해요.
            </p>
          </div>
        </div>
      </section>

      <section className={clsx(s.sec, s.year)} aria-labelledby="landing-year">
        <div className={s.in}>
          <h2 id="landing-year" className={s.h2}>
            한 해가
            <br />한 권의 일기장으로
          </h2>
          <p className={clsx(s.lead, s.center)}>
            달마다 가장 오래 머문 문장이 차례가 되고, 내가 고른 한 문장이 표지가 돼요.
          </p>
          <div className={s.ystage} aria-hidden="true">
            {MONTHS.map((m) => (
              <div key={m.m} className={clsx(s.v, m.cls)}>
                <div className={s.m}>{m.m}</div>
                <div className={s.q}>{m.q}</div>
              </div>
            ))}
            <div className={s.tcov}>
              <div className={s.by}>나의 이름 지음</div>
              <div className={s.ti}>생각이 깊어진다는 것은 무엇을 내려놓을지 알게 되는 일이다</div>
              <div className={s.ft}>
                <span>2026</span>
                <span>문장 46</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={clsx(s.sec, s.close)} aria-labelledby="landing-start">
        <div className={s.in}>
          <h2 id="landing-start" className={clsx(s.h1, s.closeTitle)}>
            오늘 읽은 한 줄부터
          </h2>
          <p className={clsx(s.lead, s.center)}>가입은 메일 주소 하나면 돼요.</p>
          <div className={s.ctas}>
            <Button asChild size="lg" className={CTA}>
              <Link href="/signup">기록 시작하기</Link>
            </Button>
          </div>
        </div>
      </section>
      <LandingFooter />
    </div>
  );
}
