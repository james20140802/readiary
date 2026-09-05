import ExcerptBooklet from '@/components/books/ExcerptBooklet';
import SlideHeading from './SlideHeading';
import { BOOKLET_DEMO } from './demo';

/** ⑤ 발췌집 — 완독의 보상으로 받는 작은 시집. 한 장에 다 실리지 않아 아래로 사라지게 둔다 */
export default function LandingBooklet() {
  return (
    <div className="md:grid md:grid-cols-[5fr_6fr] md:items-center md:gap-10">
      <SlideHeading
        eyebrow="발췌집"
        title="완독한 책은 한 권의 발췌집이 됩니다"
        body="옮겨 적은 문장들이 잉크 번호를 달고 차례로 실리고, 끝에는 판권장이 붙습니다. 그대로 이미지로 내보내 나눌 수 있어요."
      />
      <div className="relative mt-6 max-h-[46svh] overflow-hidden md:mt-0 md:max-h-[64svh]">
        <ExcerptBooklet {...BOOKLET_DEMO} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-paper to-transparent"
        />
      </div>
    </div>
  );
}
