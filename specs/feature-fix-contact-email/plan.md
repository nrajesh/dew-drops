# Web3Forms Integration Plan

## Technical Context
The project uses React, React Hook Form, and Zod for standard form validation and submission. We'll leverage `fetch` to POST the data straight to the Web3Forms API `https://api.web3forms.com/submit`. No additional packages are strictly necessary.

## Proposed Changes
1. **`.env.example`**
   - Add `VITE_WEB3FORMS_ACCESS_KEY=` placeholder to inform others.
2. **`src/pages/Contact.tsx`**
   - Add a hidden `botcheck` input field mapped appropriately.
   - Modify the `onSubmit` function to send a JSON POST request to the Web3Forms endpoint.
   - Handle the API response by displaying success/error toasts.
   - Refactor the current local simulation code so that actual emails are sent.
3. **`README.md`** (optional, but good for documenting how to obtain the Web3Forms access key).

## Verification Plan
- Insert a mock or real Web3Forms test access key locally to test submitting a form.
- Ensure the toast correctly displays "Message sent successfully".
- Attempt submitting leaving the required fields blank to ensure Zod still provides correct validations.
- Verify spam protection by programmatically filling the honeypot field.
