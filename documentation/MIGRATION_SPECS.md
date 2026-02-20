# Migration Specs: Vite + React + Tailwind/Shadcn + vite-plugin-pwa

## 1. Goal
Transition the **dew-drops** portfolio project to a modern, high-performance web stack. This migration focuses on adopting Vite for rapid tooling, React for the UI, Tailwind CSS alongside Shadcn/ui for styling, and `vite-plugin-pwa` to enable offline capabilities and progressive web app features.

## 2. Migration Path & Technologies

### Build Tooling -> Vite
- **Objective**: Replace any existing bundlers (e.g., Create React App, Webpack) with Vite for extremely fast Hot Module Replacement (HMR) and optimized builds.
- **Implementation**:
  - Update `package.json` to use Vite CLI commands (`vite`, `vite build`, `vite preview`).
  - Configure `vite.config.ts` with React plugin.

### UI Framework -> React
- **Objective**: Use React 18+ for building the interactive components of the portfolio, CV match maker, blog, photography, and travelogue.
- **Implementation**:
  - Ensure all components are functional and use modern hooks.
  - Structure routing using React Router, keeping route definitions clean and modular.

### Styling -> Tailwind CSS & Shadcn/ui
- **Objective**: Adopt a utility-first CSS framework and highly customizable component library to rapidly build the mobile-first UI.
- **Implementation**:
  - Integrate `tailwindcss`, `postcss`, and `autoprefixer`.
  - Configure `tailwind.config.ts` to support the project's specific design tokens.
  - Initialize and integrate `shadcn/ui` for consistent, accessible UI components (e.g., dialogs, forms, buttons).

### PWA Capabilities -> vite-plugin-pwa
- **Objective**: Provide offline support and installability, critical for a mobile-first application showcasing photography and travelogues.
- **Implementation**:
  - Install and configure `vite-plugin-pwa` in `vite.config.ts`.
  - Generate and inject service workers to cache essential static assets.
  - Configure `manifest.json` via the plugin to specify icons, theme colors, and the app's short name ("Dew Drops").

## 3. Business Logic & Security Re-verification
- **Single Admin Principle**: Ensure that during the migration, the secure edit access mechanism remains intact and strictly limits write operations to the single admin.
- **Mobile-First Validation**: All Tailwind classes applied during the migration must adhere to a `mobile-first` paradigm, adding breakpoints only for larger screens (e.g., `md:`, `lg:`).

## 4. Verification Checklists
- [ ] Vite development server boots successfully and HMR is functional.
- [ ] Production build (`pnpm build`) completes without errors.
- [ ] Tailwind styles correctly apply in both dev and prod environments.
- [ ] Shadcn components render correctly and pass basic accessibility checks.
- [ ] Service worker registers successfully and caches assets defined in the PWA config.
- [ ] Mobile-first layouts hold up under browser resizing and device emulation.
- [ ] Admin write endpoints remain fully secured after migration.
