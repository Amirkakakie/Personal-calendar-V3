# Chronos Platform Stabilization, Redesign & Visualization Architecture

Comprehensive architectural stabilization, multi-tenant isolation, cryptographic session security, Google Gemini AI integration, Google OAuth, and mobile-first dashboard enhancement for Chronos (Personal & Team Operating System).

### Status: Sprint 01, 02 & 03 Complete (100% Verified)

> [!IMPORTANT]
> **Key Achievements:**
> - **Sprint 01: Multi-Tenant Security & Isolation**: 19 security test scenarios (61/61 assertions passed). Cryptographic JWT verification via `jose`, `bcryptjs` password hashing, tenant partitioning (`partitions[userId]`), zero cross-tenant leakage.
> - **Sprint 02: Google Gemini AI & Google OAuth**: Official `@google/genai` TypeScript SDK integration with configurable models, SSE streaming (`/api/ai/coach/stream`), Google Account OIDC authentication with server verification (`/api/auth/google`), and resilient PostgreSQL database handling.
> - **Sprint 03: UI/UX Audit, Mobile-First Redesign & Dashboard Visualizations**:
>   1. **Mobile Bottom Navigation (`MobileBottomNav.tsx`)**: Ergonomic fixed bottom navigation bar (Dashboard, Tasks, Matrix, Calendar, More) adhering to the natural thumb zone with hitboxes $\ge 44\text{px} \times 44\text{px}$, safe-area support (`env(safe-area-inset-bottom)`), and a smooth secondary drawer sheet.
>   2. **Interactive SVG Visualizations (`src/components/charts/`)**:
>      - `ProductivityTrendChart.tsx`: 7-day velocity and focus minutes area/line chart with bezier curves, gradient fill, hover points, and reactive tooltips.
>      - `CategoryDonutChart.tsx`: Interactive SVG donut chart calculating domain life balance percentages with hover slices, center stat counter, and interactive category filter.
>      - `QuadrantDistributionChart.tsx`: Eisenhower distribution comparison for reactive vs. strategic task allocation.
>   3. **Enhanced KPI Metrics (`StatsCards.tsx`)**: Redesigned with SVG circular progress rings, flame streaks, daily focus indicators, and toggleable trend analytics.
>   4. **Mobile Responsive Eisenhower Matrix (`EisenhowerMatrix.tsx`)**: Responsive segmented quadrant switcher (`All 4 | Q1 | Q2 | Q3 | Q4`) preventing horizontal squishing on mobile screens ($< 768px$) while maintaining full 2x2 grid on desktop ($\ge 768px$).
>   5. **Adaptive Dialog Drawers (`TaskModal.tsx`, `GoalModal.tsx`)**: Bottom-sheet sliding drawer behavior on small mobile viewports ($< 640px$) and centered dialogs on desktop.
>   6. **Anti-Slop & Zero-Pill Discipline**: Removed decorative pulsing dots, replaced pill capsules with clean unboxed text (`·` separators), and enforced `font-mono tabular-nums` for all numeric metrics.
>   7. **Bilingual Polish**: Seamless LTR (English) and RTL (Persian / Vazirmatn) support with high contrast and zero layout shift.

---

### 1. Visual Design & Mobile-First Principles

- **60-30-10 Color Hierarchy**:
  - 60% Canvas: Deep dark neutral background (`#09090b` / `bg-neutral-950`).
  - 30% Structural Surface: Clean card surfaces (`bg-neutral-900/60`), subtle borders (`border-white/5` and `border-neutral-800`), glass blur overlays.
  - 10% Purposeful Accents: Indigo for primary actions (`#6366f1`), emerald for completions, amber for focus/streak, rose for urgent items.
- **Mobile Touch Discipline**:
  - Every interactive touch target (buttons, checkboxes, segmented tabs, menu toggles) has a minimum physical hitbox of $44\text{px} \times 44\text{px}$.
  - Sticky surfaces cap at $\le 15\%$ viewport height ($56\text{px}$ top bar + $56\text{px}$ bottom nav bar), maximizing content area.
  - Main scroll area includes `pb-28 lg:pb-8` bottom padding to prevent content from ever getting hidden behind the fixed bottom bar.
- **Zero-Pill Rule**:
  - Replaced decorative pill badges around static metadata (priorities, categories) with clean unboxed text and subtle dot separators.
  - Numbers and dates use `font-mono tabular-nums` to eliminate jitter during updates.

---

### 2. Component Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CHRONOS CLIENT (SPA)                          │
├────────────────────────────────────────────────────────────────────────┤
│  Top Bar (56px): [Brand] ── [Personal / Team] ── [Search Cmd+K] ── [User]│
├────────────────────────────────────────────────────────────────────────┤
│  Desktop: Collapsible Sidebar (w-16 / w-64)                            │
│  Mobile: Fixed Bottom Navigation Tab Bar (48px - 56px touch zone)      │
│          [Dashboard] [Tasks] [Matrix] [Calendar] [••• More Drawer]     │
├────────────────────────────────────────────────────────────────────────┤
│  Views:                                                                │
│  ├── Dashboard:                                                        │
│  │   ├── Burnout Alert Banner                                          │
│  │   ├── StatsCards (Circular Ring + Sparkline + Toggleable Charts)    │
│  │   │   ├── ProductivityTrendChart (7-day SVG Velocity & Focus)       │
│  │   │   └── CategoryDonutChart (Interactive Domain Life Balance)      │
│  │   ├── Pressing Priorities & Daily Agenda Preview                    │
│  │   ├── QuadrantDistributionChart (Eisenhower ratio bars)             │
│  │   └── HabitHeatmap (8W/16W adaptive touch-pan heatmap)              │
│  ├── Tasks & Kanban:                                                   │
│  │   ├── Responsive Search & Multi-Filters (Category, Status, Sort)    │
│  │   └── TaskListView (44px touch targets, list & kanban modes)        │
│  ├── Eisenhower Matrix (Segmented mobile tabs + 2x2 desktop grid)      │
│  ├── Energy Calendar (Circadian focus bands, tap-to-schedule slots)    │
│  ├── Projects Portfolio (Initiatives, hourly valuation, Google Docs)   │
│  ├── Goals & OKRs (Quarterly/annual progress bars, key results)        │
│  ├── Time ROI Stopwatch (Live billable tracker, project attribution)   │
│  ├── RPG Skill Tree (XP node progression, achievement badges)          │
│  └── AI Coach Panel (Gemini SSE chat stream, executive brief)          │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Verification & Test Outcomes

- **TypeScript Compilation**: `compile_applet` passed (`vite build` succeeded with 0 errors).
- **ESLint & Type Safety**: `lint_applet` passed (`tsc --noEmit` succeeded with 0 errors).
- **Backend & Security Suite**: 19 security scenarios with 80/80 assertions passed.
- **E2E Integration Suite**: 16/16 end-to-end assertions passed.
- **Super Admin Security Suite**: 14/14 automated admin test scenarios passed with 15/15 assertions.
- **Bilingual i18n Validation**: 621 matching keys verified between `en.json` and `fa.json`.
- **Server Health**: Port 3000 responding HTTP 200 with strict CSP and security headers.

---

### Sprint 04: Secure Super Admin Control Center (`/admin`) — Complete

1. **Authentication & Authorization Guard (`/server/middleware/adminAuth.ts`)**:
   - `requireSuperAdmin` middleware queries live database record for every request.
   - Strictly enforces `user.role === 'superadmin'` and `user.status === 'active'`.
   - Unauthorized attempts return HTTP 403 Forbidden and record tamper-evident audit logs.
2. **Platform Owner Bootstrap (`/scripts/bootstrap-superadmin.ts`)**:
   - CLI command `npm run admin:bootstrap` promotes platform owner (`amir.work.vr@gmail.com`).
   - Server initializes environment-configured super admin from `CHRONOS_SUPERADMIN_EMAIL`.
   - Never exposes credentials or automatically promotes public registrations.
3. **Admin APIs & Database Methods (`/server/routes/adminRouter.ts`)**:
   - `/api/admin/overview`: Real-time user, project, team, and task aggregations.
   - `/api/admin/analytics`: Date-range time-series analytics (7d, 30d, 90d, 1y).
   - `/api/admin/users`: Search, filter, inspect, suspend/reactivate, role modification, password reset, double-confirmation delete.
   - `/api/admin/projects`: Cross-platform inspection of personal & team projects, archive/restore, and delete.
   - `/api/admin/teams`: Workspace directory, members inspection, team projects, and team deletion.
   - `/api/admin/tasks`: Global task inspection across all scopes, priorities, and statuses.
   - `/api/admin/audit-logs`: Structured audit stream with actor, IP, timestamp, and JSON payload viewer.
   - `/api/admin/system/health` & `/system/maintenance`: Persistence engine diagnostics, memory telemetry, uptime, and integrity verification.
4. **Independent Frontend Control Center (`/src/components/admin/`)**:
   - Accessible at `/admin` independently of user workspace.
   - `AdminAccessDenied.tsx`: HTTP 403 Forbidden screen with clean recovery actions.
   - `AdminLayout.tsx`: Responsive navigation, Super Admin shield badge, language switcher, and exit button.
   - `AdminOverviewView.tsx`: KPI cards, quick actions, recent registrations, and audit logs.
   - `AdminAnalyticsView.tsx`: Interactive SVG charts with responsive tooltips and timeframe selectors.
   - `AdminUsersView.tsx`: Searchable user table with full administrative modal workflows.
   - `AdminProjectsView.tsx`: Global project management and read-only inspection.
   - `AdminTeamsView.tsx`: Collaborative teams control and directory inspection.
   - `AdminTasksView.tsx`: Platform-wide tasks monitor and filter.
   - `AdminAuditLogsView.tsx`: Security event stream with JSON detail modal.
   - `AdminSystemHealthView.tsx`: Database status, memory usage, uptime, and maintenance check.
   - `AdminSettingsView.tsx`: Platform owner CLI instructions and active security architecture summary.

