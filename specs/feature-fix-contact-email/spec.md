# Web3Forms Contact Form Integration Spec

## Problem Statement
The current Contact page utilizes a "local simulation" for form submissions, meaning emails are not actually being sent. The user is currently using SendGrid but it's typically more suitable for backend apps, whereas our current setup is entirely a frontend web app. We need a reliable and easy-to-integrate frontend email solution with built-in spam protection.

## Goals
- Integrate Web3Forms as the email delivery service since it is highly suited for frontend applications and requires no backend setup.
- Add honeypot functionality (hidden fields) to silently catch and prevent bot spam.
- Preserve the existing form fields (Name, Email, Subject, Message).
- Show appropriate toast notifications for successful and failed actual submissions.

## Non-Goals
- We will not integrate complex CAPTCHAs (like reCAPTCHA) unless the honeypot method proves insufficient, to keep UX frictionless.
- We will not add or remove form fields.

## User Stories
- As a user, I want to submit the contact form and actually send an email to the site owner.
- As a site owner, I want to receive real emails from my users.
- As a site owner, I want to avoid spam emails from bots by utilizing a hidden honeypot field.

## Functional Requirements
- The form should submit data (Name, Email, Subject, Message) to Web3Forms using their API.
- A hidden field (honeypot) called `botcheck` must be included in the form to catch automated spam.
- An environment variable `VITE_WEB3FORMS_ACCESS_KEY` must be used to securely pass the Web3Forms key.
- If submission fails, an error toast should be shown.
- If submission succeeds, a success toast should be shown and the form should be reset.

## Non-Functional Requirements
- The UI must remain responsive and visually identical to the current design.
- The submit button state should be updated correctly to "Sending..." during submission.
