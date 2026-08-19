# Unified Campaign Platform — Architecture Refactor

## Phase 1 — Foundation: Unified Campaign Model + Repository Pattern
- [x] Create `src/platform/types.ts` (strongly-typed Campaign superset)
- [x] Create `src/platform/repository.ts` (repository interface + Local + Api impls)
- [x] Create `src/platform/migrations.ts` (migrate legacy Website → Campaign)
- [x] Create `src/platform/store.ts` (zustand store consuming repository)
- [x] Create `src/platform/seed.ts` (seed Campaign #1 = real Marjane, no fake data)

## Phase 2 — Single Rendering Engine
- [x] Create `src/engine/CampaignEngine.tsx` (refactored App.tsx, campaigns-driven)
- [x] Create `src/engine/theme.ts` (theme → CSS vars / brand mapping)
- [x] Create `src/engine/translations.ts` (campaign.translations → dict)
- [x] Refactor 5 screens to consume campaign (Form, Scan, Dice, Cards, Result)
- [x] Create `src/platform/games.ts` (game plugin registry)

## Phase 3 — Routing / URL System
- [x] Update `src/main.tsx` (public route reads slug from URL)
- [x] Create public `/:slug` route rendering CampaignEngine
- [x] Create `src/App.tsx` (legacy fallback → marjane campaign by slug)

## Phase 4 — Admin Data Layer Rewire
- [x] Update admin to consume new store (Websites → Campaigns) via adapter
- [x] Update Dashboard, Workspace, Sidebar, Topbar to new model
- [x] Bind ThemeEditor to campaign.theme with REAL engine preview
- [x] Bind Pages editor to campaign.pages (persisted)
- [x] Bind Products/Prizes/Assets/Languages to campaign.*
- [x] Remove fake preview (PhoneFrame fake) → use CampaignEngine

## Phase 5 — Backend / API
- [x] Extend FastAPI with campaign-scoped endpoints (CRUD) — `/api/campaigns`
- [x] Add repository-based ApiCampaignRepository (full REST impl, cache hydration)

## Phase 6 — Code Quality & Verification
- [x] Remove dead code (mock-data, fake preview, duplicate store)
- [x] `npm run build` passes (2845 modules)
- [x] TypeScript strict passes
