# Specification: Website Redesign (React Native / PWA)

## 1. Problem Statement
The user needs to transition the `dew-drops` portfolio project to a modern, high-performance web stack. The goal is to make it "blazing fast to load" and "very lightweight to run on any device", given that it consists of mostly static content (portfolio, CV, blog, photography, travelogue). 
The user explicitly requested "React Native" and "PWA ready", while the existing `MIGRATION_SPECS.md` document specifies a migration to `Vite`, `React 18+`, `TailwindCSS/Shadcn`, and `vite-plugin-pwa`.

## 2. Goals & Non-Goals

### Goals
- Redesign the website to be extremely fast and lightweight.
- Implement Progressive Web App (PWA) capabilities for offline support and installability.
- Ensure cross-device compatibility (mobile-first design).
- Maintain the single admin secure edit access (as per MIGRATION_SPECS.md).
- Resolve ambiguity regarding the exact framework (React vs. React Native for Web).

### Non-Goals
- Changing the primary content structure (blog, CV, travelogue stays intact).
- Building dedicated native app binaries for iOS/Android (unless React Native CLI/Expo is specifically required over a PWA).

## 3. User Stories
- As a visitor, I want the website to load instantly, even on slow connections, so I can view the portfolio and blogs without waiting.
- As a mobile user, I want the UI to be fully responsive and "mobile-first" so that the photography and travelogues look great on my device.
- As a user, I want to be able to install the website as a PWA on my phone's home screen for offline access.
- As an admin, I want to securely access the site to make edits to the content without exposing write operations to the public.

## 4. [NEEDS CLARIFICATION] Requirements

> [!WARNING]
> The original `MIGRATION_SPECS.md` details a migration path using **React (web), Vite, Tailwind, and Shadcn/ui**. However, the prompt specifically asks to make it **React Native**. 

**1. Framework Decision:**
Do you want to build this as a true **React Native** application (e.g., using Expo to target iOS, Android, and Web simultaneously), or did you mean **React.js** (for the web) with a mobile-first design as outlined in the `MIGRATION_SPECS.md`? 

**2. Existing Stack:**
The current `package.json` already contains `react`, `vite`, `tailwindcss`, and `shadcn` components. If we switch to React Native, we will need to rewrite the UI entirely using React Native primitives (`<View>`, `<Text>`) and drop Vite/Tailwind in favor of Expo and React Native styling solutions (like `NativeWind`). Is this the desired path?

## 5. Success Criteria
- **Performance:** Lighthouse score of 95+ for Performance, Accessibility, Best Practices, and SEO.
- **PWA Capabilities:** The application passes all PWA criteria (installable, offline support via service worker).
- **Responsiveness:** UI renders correctly and optimally across mobile, tablet, and desktop viewports.
- **Security:** Admin paths remain restricted and secure.
