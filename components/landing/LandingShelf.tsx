import BookSpineShelf from '@/components/books/BookSpineShelf';
import SlideHeading from './SlideHeading';
import { SHELF_DEMO } from './demo';

/** ④ 책장 — 내 책 화면의 책등 서가 그대로. 두께는 쪽수, 잉크 점 하나는 완독 */
export default function LandingShelf() {
  return (
    <div>
      <SlideHeading
        eyebrow="책장"
        title="책장은 두께로 말합니다"
        body="책등의 두께는 쪽수에 비례하고, 완독한 책은 눌린 종이색에 잉크 점 하나가 찍힙니다. 진행률 막대 없이도 책장이 성취를 말해 줘요."
      />
      <div className="mt-10 md:mt-12">
        <BookSpineShelf books={SHELF_DEMO} className="max-w-[440px]" />
      </div>
      <p className="mt-6 text-caption text-ink-faint">
        책등을 누르면 책이 꺼내지고, 표지가 펼쳐집니다.
      </p>
    </div>
  );
}
