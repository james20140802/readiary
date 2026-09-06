import { describe, expect, it } from 'vitest';
import { splitLegalBlocks } from '@/lib/legal/blocks';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, PRIVACY_CONSENT } from '@/lib/legal/texts';

describe('splitLegalBlocks', () => {
  it('빈 줄로 나눈 덩어리마다 하나의 블록을 만든다', () => {
    const blocks = splitLegalBlocks('첫 문단\n\n둘째 문단');
    expect(blocks).toEqual([
      { heading: null, body: '첫 문단' },
      { heading: null, body: '둘째 문단' },
    ]);
  });

  it('"제n조 (…)"로 시작하는 첫 줄은 제목으로 떼어 낸다', () => {
    const blocks = splitLegalBlocks('제1조 (목적)\n본 약관은…\n둘째 줄');
    expect(blocks).toEqual([{ heading: '제1조 (목적)', body: '본 약관은…\n둘째 줄' }]);
  });

  it('제목만 있는 덩어리는 본문이 빈 문자열이다', () => {
    expect(splitLegalBlocks('제9조 (약관의 변경)')).toEqual([
      { heading: '제9조 (약관의 변경)', body: '' },
    ]);
  });

  it('연속된 빈 줄과 앞뒤 공백을 무시한다', () => {
    const blocks = splitLegalBlocks('\n\n가\n\n\n\n나\n\n');
    expect(blocks.map((b) => b.body)).toEqual(['가', '나']);
  });
});

describe('법적 고지 본문', () => {
  it('두 문서 모두 조문 제목으로 나뉜다', () => {
    for (const text of [TERMS_OF_SERVICE, PRIVACY_POLICY]) {
      const headings = splitLegalBlocks(text).filter((b) => b.heading);
      expect(headings.length).toBeGreaterThan(5);
    }
  });

  it('개인정보처리방침은 Google 로그인으로 받는 정보와 그 정책 준수를 밝힌다', () => {
    expect(PRIVACY_POLICY).toContain('Google');
    expect(PRIVACY_POLICY).toContain('Google API 서비스 사용자 데이터 정책');
  });

  it('개인정보처리방침은 처리 위탁 대상과 문의 수단을 밝힌다', () => {
    for (const vendor of ['Supabase', 'Vercel', 'Kakao']) {
      expect(PRIVACY_POLICY).toContain(vendor);
    }
    expect(PRIVACY_POLICY).toMatch(/문의/);
  });

  it('동의서는 전체 방침 경로를 안내한다', () => {
    expect(PRIVACY_CONSENT).toContain('/privacy');
  });

  it('미완성 표식이 남아 있지 않다', () => {
    for (const text of [TERMS_OF_SERVICE, PRIVACY_POLICY, PRIVACY_CONSENT]) {
      expect(text).not.toMatch(/TODO|TBD|\[\s*\]/);
    }
  });
});
