import Slide, { SlideStack } from './Slide';
import LandingHero from './LandingHero';
import LandingComposer from './LandingComposer';
import LandingRecall from './LandingRecall';
import LandingShelf from './LandingShelf';
import LandingBooklet from './LandingBooklet';
import LandingPostcard from './LandingPostcard';
import LandingProfileBook from './LandingProfileBook';
import LandingClosing from './LandingClosing';

/**
 * 랜딩 — 화면 높이의 종이 여덟 장을 한 장씩 넘긴다. 장마다 앱의 실제 UI 하나를 실물로 보여 준다:
 * 입력창, 회상 카드와 주간 리듬, 책등 서가, 발췌집, 친구의 엽서, 프로필 책, 그리고 장서표.
 * 장 순서와 폴리오는 Slide의 SLIDES가 정한다.
 */
export default function Landing() {
  return (
    <SlideStack>
      <Slide label="표지">
        <LandingHero />
      </Slide>
      <Slide label="문장">
        <LandingComposer />
      </Slide>
      <Slide label="회고">
        <LandingRecall />
      </Slide>
      <Slide label="책장">
        <LandingShelf />
      </Slide>
      <Slide label="발췌집">
        <LandingBooklet />
      </Slide>
      <Slide label="엽서">
        <LandingPostcard />
      </Slide>
      <Slide label="프로필">
        <LandingProfileBook />
      </Slide>
      <Slide label="시작">
        <LandingClosing />
      </Slide>
    </SlideStack>
  );
}
