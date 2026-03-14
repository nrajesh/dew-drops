# Implementation Tasks

## Phase 1: Environment Variables Setup
- [ ] Add `VITE_WEB3FORMS_ACCESS_KEY=` into `.env.example`.
- [ ] Add the same variable directly into your `.env.local`.

## Phase 2: Form Integration (src/pages/Contact.tsx)
- [ ] Incorporate the hidden `botcheck` form field within your `form` HTML structure (`display: none`).
- [ ] Refactor your `onSubmit` function in `src/pages/Contact.tsx`.
- [ ] Append the Web3Forms `access_key` to your POST request payload.
- [ ] Validate standard response (`status === 200` implies `success` property implies Email Sent). Use appropriate success and error toasts.

## Phase 3: Project Verification Checklists
- [ ] Attempt standard validations. Confirm the user sees real toast messages over hardcoded ones.
- [ ] Request or instruct the reviewer to place their own key in `.env.local` or provide one for testing.
