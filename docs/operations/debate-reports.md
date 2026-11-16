# 문장 토론 신고 확인

문장 토론에서는 발제자의 친구라면 서로 친구가 아니어도 같은 토론의 답을 읽는다. 그래서 신고 경로를 1차 출시부터 두었다. 이 문서는 운영자가 신고를 확인하고 처리하는 순서다. 설계: [문장 토론 설계](../superpowers/specs/2026-11-17-sentence-debate-design.md)의 "신고와 숨기기".

## 무엇이 쌓이나

- 테이블 `public.debate_reports`: 신고한 사람(`reporter_id`), 토론(`debate_id`), 답·답글(`answer_id`, 토론 자체 신고면 null), 사유(`abuse` 불쾌하거나 공격적인 말 · `spam` 광고·도배 · `privacy` 개인정보 노출 · `other` 그 밖의 이유), 메모(500자까지), 시각.
- 같은 사람이 같은 대상을 두 번 신고할 수 없다. 일반 사용자는 이 테이블을 읽지도 쓰지도 못하고, `report_debate` RPC로만 남긴다.
- 신고한 사람의 화면에서는 그 답이 "신고한 답이에요 · 펼치기"로 접힌다. 다른 사람에게는 변화가 없다. 자동으로 숨기는 규칙은 없다.

## 확인 순서

Supabase SQL Editor(서비스 역할)에서 읽기 전용으로 확인한다. 본문을 로그·문서·이슈에 옮기지 않는다.

```sql
-- 최근 신고와 대상 요약(본문은 첫 80자만)
select r.created_at, r.reason, r.memo, r.debate_id, r.answer_id,
       left(coalesce(a.body, d.question), 80) as excerpt,
       (select count(*) from public.debate_reports x
         where x.debate_id = r.debate_id and x.answer_id is not distinct from r.answer_id) as reports_on_target
from public.debate_reports r
join public.debates d on d.id = r.debate_id
left join public.debate_answers a on a.id = r.answer_id
order by r.created_at desc
limit 50;
```

## 처리

- 발제자가 이미 숨겼는지: `select hidden_at from public.debate_answers where id = '<answer_id>';`
- 운영자가 숨겨야 하면 서비스 역할로 `hidden_at`을 채운다. 쓴 사람과 발제자에게는 "숨긴 답이에요"로 남고 나머지에게는 사라지며 집계에서 빠진다.

  ```sql
  update public.debate_answers set hidden_at = now() where id = '<answer_id>' and hidden_at is null;
  ```

- 개인정보 노출처럼 본문을 남기면 안 되는 경우에만 본문을 지운다. 답글이 있으면 자리만 남기는 앱의 지우기와 같게 한다.

  ```sql
  update public.debate_answers
  set deleted_at = now(), body = null, evidence_quote = null, evidence_book_title = null,
      evidence_book_author = null, evidence_page_from = null, evidence_page_to = null, evidence_entry_id = null
  where id = '<answer_id>';
  ```

- 처리 내용은 노션 이슈에 대상 id와 사유 종류만 남긴다(본문·닉네임은 남기지 않는다).

## 아직 없는 것

- 관리 화면, 신고 알림, 반복 신고 계정 제한. 신고가 쌓이기 시작하면 별도 이슈로 다룬다.
