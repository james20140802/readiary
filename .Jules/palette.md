## 2024-04-03 - Missing ARIA labels on icon-only interactive elements

**Learning:** Found a recurring pattern in the codebase where icon-only buttons (`Trash2`, `Heart`, `MessageCircle`, `X`, `Send`, `UserMinus`) lack `aria-label` attributes. This makes the interface inaccessible to screen reader users, as they cannot discern the function of these buttons without descriptive text.
**Action:** When adding new interactive components, especially buttons that only contain icons, ensure they always have an appropriate `aria-label` attribute describing their action (e.g., "좋아요", "댓글 보기", "닫기").
