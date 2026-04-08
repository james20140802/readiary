## 2024-06-18 - Standardizing Form Accessibility with useId()
**Learning:** Reusable form components (like `Input` and `Textarea`) often omit unique `id` attributes when rendered multiple times, causing screen readers to fail at associating `<label>` and error messages with the correct input fields.
**Action:** Always utilize React's `useId()` inside generic UI components to auto-generate unique `id`s if one isn't explicitly provided, ensuring `htmlFor`, `aria-invalid`, and `aria-describedby` remain accessible by default.
