import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_DELETION_EFFECTIVE_AT,
  LEGAL_ANNOUNCED,
  LEGAL_REVISION,
  PHOTO_TEXT_PRIVACY_ANNOUNCED,
  PHOTO_TEXT_PRIVACY_EFFECTIVE,
  PHOTO_TEXT_PRIVACY_EFFECTIVE_AT,
  PRIVACY_EFFECTIVE,
  PRIVACY_POLICY,
} from '../texts';
import { splitLegalBlocks } from '../blocks';

describe('사진 글자 읽기 — 개인정보처리방침', () => {
  it('걸려 있는 개정판의 공고일과 시행일은 그대로다', () => {
    expect(LEGAL_ANNOUNCED).toBe('2026년 11월 13일');
    expect(PRIVACY_EFFECTIVE).toBe('2026년 12월 13일');
    expect(ACCOUNT_DELETION_EFFECTIVE_AT).toBe('2026-12-13T00:00:00+09:00');
  });

  it('이 항목만의 공고일과 시행 시각을 따로 두고, 공고 뒤 7일에 시행한다', () => {
    expect(PHOTO_TEXT_PRIVACY_ANNOUNCED).toBe('2026년 11월 21일');
    expect(PHOTO_TEXT_PRIVACY_EFFECTIVE).toBe('2026년 11월 28일');
    expect(PHOTO_TEXT_PRIVACY_EFFECTIVE_AT).toBe('2026-11-28T00:00:00+09:00');
    expect(Date.parse(PHOTO_TEXT_PRIVACY_EFFECTIVE_AT)).toBeLessThan(
      Date.parse(ACCOUNT_DELETION_EFFECTIVE_AT)
    );
  });

  it('무엇을 처리하고 저장하지 않는지 수집 항목에 적는다', () => {
    expect(PRIVACY_POLICY).toContain('7. 선택한 사진 글자 읽기를 쓸 때 처리하는 정보');
    expect(PRIVACY_POLICY).toContain(
      '찍은 책 페이지 사진(저장하지 않음), 동의·철회 시각과 안내 문구 버전, 하루 사용 횟수'
    );
  });

  it('목적과 선택 기능 범위에 넣는다', () => {
    expect(PRIVACY_POLICY).toContain('6. 선택한 사진 글자 읽기:');
    expect(PRIVACY_POLICY).toContain('4~6호의 선택 기능');
    expect(PRIVACY_POLICY).not.toContain('4~5호의 선택 기능');
  });

  it('Google로의 국외 전송과 거부 방법을 위탁 조항에 적는다', () => {
    expect(PRIVACY_POLICY).toContain('7. Google LLC(미국) — 사진 속 글자 읽기(Cloud Vision).');
    expect(PRIVACY_POLICY).toContain(
      '읽는 시점에 전송되며 Google은 읽은 뒤 사진을 보관하지 않습니다.'
    );
    expect(PRIVACY_POLICY).toContain('동의하지 않거나 설정에서 철회할 수 있습니다.');
  });

  it('사진과 읽은 결과를 기기 캐시에 두지 않는다고 적는다', () => {
    expect(PRIVACY_POLICY).toContain('사진 글자 읽기에 쓴 사진과 읽은 결과도 저장하지 않습니다.');
  });

  it('부칙에 이 항목의 공고와, 시행 전에는 동의한 이용자에게만 적용함을 적는다', () => {
    expect(PRIVACY_POLICY).toContain(
      `${PHOTO_TEXT_PRIVACY_ANNOUNCED} 공고하며 ${PHOTO_TEXT_PRIVACY_EFFECTIVE}부터 시행하되, 그 전에는 기능 안에서 따로 동의한 이용자에게만 적용합니다.`
    );
  });

  it('개정 안내에 한 줄을 더한다', () => {
    expect(LEGAL_REVISION.privacyChanges.some((line) => line.includes('Google(미국)'))).toBe(true);
  });

  it('조문 나누기가 깨지지 않는다 — 조문 수는 그대로 11개다', () => {
    const headings = splitLegalBlocks(PRIVACY_POLICY);
    expect(headings.filter((b) => b.heading && /^제\d+조/.test(b.heading))).toHaveLength(11);
  });
});
