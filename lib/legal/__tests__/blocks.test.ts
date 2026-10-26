import { describe, expect, it } from 'vitest';
import { splitLegalBlocks } from '@/lib/legal/blocks';
import {
  EMAIL_PRIVACY_ADDENDUM,
  LEGAL_ANNOUNCED,
  PRIVACY_EFFECTIVE,
  PRIVACY_POLICY,
  TERMS_EFFECTIVE,
  TERMS_OF_SERVICE,
} from '@/lib/legal/texts';

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

  it('필수 처리는 계약 이행 근거로, 만 14세 확인은 프로필을 만들 때로 안내한다', () => {
    expect(PRIVACY_POLICY).toContain('제15조 제1항 제4호');
    expect(TERMS_OF_SERVICE).toContain('처음 프로필을 만들 때 만 14세 이상임을 확인받습니다');
    expect(PRIVACY_POLICY).not.toContain('가입 동의 시각');
  });

  it('개정판은 공고하고 7일 뒤 시행한다 — 처리방침과 이메일 소식 안내가 같은 날짜를 쓴다', () => {
    expect(LEGAL_ANNOUNCED).toBe('2026년 10월 27일');
    expect(TERMS_EFFECTIVE).toBe('2026년 11월 3일');
    expect(PRIVACY_EFFECTIVE).toBe('2026년 11월 3일');
    expect(PRIVACY_POLICY).toContain(`${LEGAL_ANNOUNCED} 공고하며 ${PRIVACY_EFFECTIVE}부터 시행`);
    expect(EMAIL_PRIVACY_ADDENDUM).toContain(
      `${LEGAL_ANNOUNCED} 공고하며 ${PRIVACY_EFFECTIVE}부터 시행`
    );
  });

  it('미완성 표식이 남아 있지 않다', () => {
    for (const text of [TERMS_OF_SERVICE, PRIVACY_POLICY, EMAIL_PRIVACY_ADDENDUM]) {
      expect(text).not.toMatch(/TODO|TBD|\[\s*\]/);
    }
  });
});
