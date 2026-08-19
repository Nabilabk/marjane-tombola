# Admin platform — what was added

Everything under `src/admin/` is new. Nothing in the original project was
modified except two files, both minimal, additive edits:

- `package.json` — added 3 dependencies the admin needs: `react-router-dom`,
  `zustand`, `recharts`. Nothing removed.
- `src/main.tsx` — wrapped in a router with two branches: `/*` still renders
  the original `<App />` exactly as before (this is your site, unchanged),
  and `/admin/*` renders the new `<AdminApp />`.

`src/App.tsx`, `src/index.css`, `src/tombola/**`, `vite.config.ts`,
`tsconfig.json`, `index.html` — all byte-for-byte the files you uploaded.

## Running it
```bash
npm install
npm run dev
```
- `/` — your original Tombola site, untouched
- `/admin` — the new white-label platform dashboard

## What's in src/admin/
- `pages/` — Platform Dashboard, Create Website Wizard, Login
- `pages/workspace/` — Overview, Theme Editor, Pages, Campaigns, Assets,
  Participants, Prizes, Analytics, Settings (per-website)
- `layouts/` — top bar (dashboard) and sidebar (workspace) shells
- `components/ui/` — design system primitives used only by the admin
- `lib/` — Zustand store + mock data + types (mock/local only, no backend)
- `preview/TombolaPreview.tsx` — the only place that touches your original
  code, and only by *importing* it (`@/tombola/...`), never editing it. It
  re-renders your actual `FormScreen` / `ScanScreen` / `WheelScreen` /
  `ResultScreen` components inside the Theme Editor's phone mockup, driven
  by props instead of the fixed `BRANDS['marjane']` your standalone
  `App.tsx` uses — that's how color changes preview live.
- `admin.css` — a separate stylesheet, scoped entirely under a single
  `.admin-shell` wrapper class, so it can't bleed into your site's styling.
