import { describe, expect, it } from 'vitest';
import { splitLegalBlocks } from '@/lib/legal/blocks';
import {
  ACCOUNT_DELETION_EFFECTIVE_AT,
  LEGAL_ANNOUNCED,
  LEGAL_REVISION,
  PRIVACY_EFFECTIVE,
  PRIVACY_POLICY,
  TERMS_EFFECTIVE,
  TERMS_OF_SERVICE,
} from '@/lib/legal/texts';
import {
  PRIVACY_2026_09_15,
  PRIVACY_2026_11_03,
  TERMS_2026_09_13,
  TERMS_2026_11_03,
} from '@/lib/legal/archive';

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

  it('개정판은 공고하고 30일 뒤 시행한다(보관이 늘어나는 변경이라 불리한 변경 기준)', () => {
    expect(LEGAL_ANNOUNCED).toBe('2026년 11월 13일');
    expect(TERMS_EFFECTIVE).toBe('2026년 12월 13일');
    expect(PRIVACY_EFFECTIVE).toBe('2026년 12월 13일');
    expect(PRIVACY_POLICY).toContain(`${LEGAL_ANNOUNCED} 공고하며 ${PRIVACY_EFFECTIVE}부터 시행`);
    expect(TERMS_OF_SERVICE).toContain(`${TERMS_EFFECTIVE}부터 적용됩니다`);
  });

  it('탈퇴 기능을 여는 시각과 오늘 화면 안내의 끝은 개정 시행일에 맞춘다', () => {
    expect(ACCOUNT_DELETION_EFFECTIVE_AT).toBe('2026-12-13T00:00:00+09:00');
    expect(LEGAL_REVISION.effective).toBe(PRIVACY_EFFECTIVE);
    // 시행일 하루가 끝나는 시각(다음 날 0시 KST)
    expect(Date.parse(LEGAL_REVISION.noticeUntil) - Date.parse(ACCOUNT_DELETION_EFFECTIVE_AT)).toBe(
      24 * 60 * 60 * 1000
    );
  });

  it('미완성 표식이 남아 있지 않다', () => {
    for (const text of [
      TERMS_OF_SERVICE,
      PRIVACY_POLICY,
      TERMS_2026_09_13,
      PRIVACY_2026_09_15,
      TERMS_2026_11_03,
      PRIVACY_2026_11_03,
    ]) {
      expect(text).not.toMatch(/TODO|TBD|\[\s*\]/);
    }
  });

  it('이메일 소식은 덧붙인 문서가 아니라 방침 조문(항목·목적·보관·위탁·권리)에 들어 있다', () => {
    expect(PRIVACY_POLICY).toContain('5. 선택한 이메일 소식을 받을 때 저장하는 정보');
    expect(PRIVACY_POLICY).toContain('5. 선택한 이메일 소식: Readiary의 새 기능');
    expect(PRIVACY_POLICY).toMatch(/수신거부 링크에서 로그인 없이 무료로 철회/);
    expect(PRIVACY_POLICY).not.toContain('추가 처리 안내');
  });

  it('지난 판은 그때 시행일을 그대로 적고, 이메일 소식을 담지 않는다', () => {
    expect(PRIVACY_2026_09_15).toContain('2026년 9월 15일부터 시행합니다');
    expect(PRIVACY_2026_09_15).not.toContain('이메일 소식');
    expect(TERMS_2026_09_13).toContain('2026년 9월 13일부터 적용됩니다');
  });

  it('지금 시행 중인 판(11월 3일)은 그때 글자 그대로 남고, 탈퇴는 아직 메일로 받는다', () => {
    expect(TERMS_2026_11_03).toContain('2026년 11월 3일부터 적용됩니다');
    expect(TERMS_2026_11_03).toContain('이번 개정 공고 2026년 10월 27일');
    expect(TERMS_2026_11_03).toContain('서비스 안에 탈퇴 기능이 마련되기 전까지는');
    expect(PRIVACY_2026_11_03).toContain(
      '2026년 10월 27일 공고하며 2026년 11월 3일부터 시행합니다'
    );
    expect(PRIVACY_2026_11_03).toContain('5. 선택한 이메일 소식을 받을 때 저장하는 정보');
    expect(PRIVACY_2026_11_03).toContain('지체 없이 지웁니다');
    expect(PRIVACY_2026_11_03).not.toContain('14일');
  });
});

describe('탈퇴 14일 유예 개정', () => {
  it('약관 제8조는 설정 화면 신청, 메일 요청, 14일 안의 취소를 밝힌다', () => {
    expect(TERMS_OF_SERVICE).toContain(
      '회원은 언제든 설정 화면에서 계정 삭제(탈퇴)를 신청할 수 있으며,'
    );
    expect(TERMS_OF_SERVICE).toContain(
      '신청 후 14일 안에 다시 로그인하면 신청을 취소할 수 있고, 14일이 지나면 계정과 정보가 지워집니다.'
    );
    expect(TERMS_OF_SERVICE).not.toContain('탈퇴 기능이 마련되기 전까지는');
  });

  it('방침 제3조는 신청 즉시 숨기고 14일 보관한 뒤 지운다고 밝힌다', () => {
    expect(PRIVACY_POLICY).toContain('14일');
    expect(PRIVACY_POLICY).toContain('다른 이용자에게 보이지 않게 하고');
    expect(PRIVACY_POLICY).not.toContain('지체 없이 지웁니다');
    expect(PRIVACY_POLICY).toContain(
      '서지 정보는 개인의 책장과의 연결을 제거한 뒤 남을 수 있습니다'
    );
    expect(PRIVACY_POLICY).toContain('복구 시 삭제 요청을 다시 반영합니다');
  });

  it('삭제 완료 기록은 항목·목적·기간(30일)을 밝힌다', () => {
    expect(PRIVACY_POLICY).toContain(
      '탈퇴로 계정을 지운 뒤에는 백업 복구 때 삭제를 다시 반영하기 위해 회원 식별번호와 삭제 시각만 30일 동안 보관하고 지웁니다. 이 기록으로는 계정이나 기록을 되살릴 수 없습니다.'
    );
  });

  it('푸시 구독은 신청 때, 이메일 소식 기록은 계정을 지울 때 삭제한다', () => {
    expect(PRIVACY_POLICY).toContain('구독 해제·만료 확인·탈퇴 신청 시 삭제합니다');
    expect(PRIVACY_POLICY).toContain('발송 처리 기록은 탈퇴로 계정을 지울 때 삭제합니다');
  });

  it('방침 제8조는 설정 화면에서 탈퇴를 신청할 수 있다고 밝힌다', () => {
    expect(PRIVACY_POLICY).toContain('3. 계정 삭제(탈퇴)는 설정 화면에서 직접 신청할 수 있고');
    expect(PRIVACY_POLICY).not.toContain('3. 계정 삭제(탈퇴)와 그 밖의 요청은 제10조의 연락처로');
  });
});
