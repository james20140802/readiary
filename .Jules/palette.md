## 2024-04-12 - [Accessibility enhancements for icons & toggles]
**Learning:** Added proper ARIA labels to buttons with dynamic toggle state (`aria-pressed`) to explicitly announce state to screen readers. Also observed `aria-hidden="true"` is essential for interactive icons (like Lucide icons) so screen readers do not redundantly read out the raw icon SVGs.
**Action:** Always pair icon-only buttons with descriptive `aria-label` and `title` attributes, add `aria-hidden="true"` to the icons themselves, and use `aria-pressed` for toggle buttons.
