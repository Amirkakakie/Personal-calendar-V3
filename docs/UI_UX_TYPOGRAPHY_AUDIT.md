# Chronos UI/UX and typography audit

## Scope reviewed

The repository's shared typography stylesheet, HTML language metadata, locale provider, application shell, navigation, header, AI coaching entry points, and Gemini service integration were reviewed.

## Findings

1. The app already loads Vazirmatn for Persian and Plus Jakarta Sans for English, but the font rules were embedded in the main stylesheet and there was no shared type scale.
2. Persian views contain many 9–11px utility labels. These are too small for comfortable reading, especially on mobile.
3. The current locale provider correctly updates `html[lang]` and `html[dir]`; the new stylesheet uses those attributes as the single source of truth.
4. Inputs, controls, mixed-direction values, technical strings and numeric content need consistent sizing and direction handling.
5. The AI features are not a blank UI stub: the app already calls server-side Gemini services for goal decomposition, daily briefing, and coaching. The backend reads `GEMINI_API_KEY` and `GEMINI_MODEL` from environment variables. The AI Coach is currently a request/response productivity assistant, not an autonomous tool-using agent.

## Changes in this branch

- Added `src/styles/typography.css` as a dedicated bilingual typography foundation.
- Introduced shared font and type-scale tokens for Persian and English.
- Set a consistent 14px body baseline, improved Persian line-height, and raised very small Persian utility labels to a more legible floor.
- Standardized inherited control typography, minimum control height, keyboard focus visibility, numeric/technical LTR handling inside RTL screens, and reduced-motion behavior.
- Loaded the new stylesheet after the existing design stylesheet so the shared rules normalize existing utility-heavy views without replacing the visual identity.

## AI capability decision

**Keep the existing AI Coach and decomposition features. Do not remove them.** They are already integrated with backend Gemini calls and provide useful productivity workflows. However, do not present them as an autonomous AI Agent: the current implementation does not demonstrate autonomous planning plus permissioned tool execution. The correct next step is to configure a fresh server-side Gemini key and verify real requests end-to-end, then decide whether a separate tool-using agent is worth building.

The API key must never be committed or exposed in browser code. Configure `GEMINI_API_KEY` as a server environment variable (for local development in an ignored `.env`, and in the deployment provider's server-side environment settings). Configure `GEMINI_MODEL` only if a different supported model is intentionally selected.

## Follow-up QA checklist

- Compare Persian and English dashboard, tasks, projects, calendar, goals, and coaching screens at desktop and mobile widths.
- Verify forms, dialogs, tables, date/time fields, and mixed Persian/Latin text.
- Confirm no clipped labels after the Persian minimum-size adjustments.
- With a newly rotated Gemini key configured server-side, test goal decomposition, daily briefing, and coach chat; test missing-key and provider-error states separately.
- Review keyboard focus and reduced-motion behavior.

## Known limitation

This is a source-level audit and shared styling improvement. A real browser visual regression pass and runtime Gemini verification require a running deployment/local environment and a valid server-side key; neither is available to this GitHub-only change.
