## 2025-03-31 - Add dynamic aria-labels to interactive icon buttons

**Learning:** Icon-only interactive buttons (like Like and Comment buttons) may contain text content that is dynamically generated but not descriptive (e.g. only numbers representing a count). These read confusingly or unhelpfully to screen reader users (e.g. reading just "4" instead of "4 likes"). Adding dynamic `aria-label`s based on their current state improves context drastically.
**Action:** When implementing interactive buttons like Likes and Comments, always provide context-rich `aria-label`s reflecting their state (e.g. "좋아요 취소, 현재 좋아요 4개" or "댓글 전송") and use `aria-hidden="true"` on the underlying graphical SVG icons to prevent redundant reading.
