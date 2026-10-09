# StageFlow

**Rätt person. Rätt plats. Rätt tid.**

StageFlow is an interactive prototype for theatre production scheduling, rehearsal coordination, personal schedules, change notifications with acknowledgements, and AI-assisted script rehearsal. It was built as a proposal for a large Swedish performing-arts institution.

It has two connected experiences:

| | For | Default device |
|---|---|---|
| **StageFlow Control** (`/control`) | Production managers, schedulers, directors, choreographers | Desktop |
| **StageFlow Personal** (`/me`) | Cast, musicians, technicians, all staff | Mobile |

> **Concept prototype.** Every person, production and script is fictional. The prototype is **not** connected to any of the theatre's systems (e.g. Yesplan). The UI labels which parts are implemented, simulated and future.

---

## Quick start

Requirements: **Node.js 20+** and npm.

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**.

- **Best first view:** **http://localhost:3000/demo**. This is a split screen with Control and Personal side by side, plus the step-by-step demo guide. It needs a window at least 1280 px wide.
- **Mobile:** on the same Wi-Fi network, open `http://<your-computer-ip>:3000/me` on your phone. Note that each browser keeps its own demo data (see *Simulated* below).
- **Reset:** click **"Återställ demo"** on the start page or in the persona menu.

Other scripts:

```bash
npm run build && npm start   # production build
npm run typecheck            # TypeScript
npm test                     # unit tests (Vitest)
npm run test:e2e             # end-to-end + accessibility tests (Playwright; starts the dev server)
npm run demo:pdf             # regenerate the fictional sample script PDF
npm run build:artifact       # standalone static build in dist-artifact/ (published as a claude.ai Artifact)
npm run build:single         # ONE self-contained file: dist-artifact/stageflow.html (open directly, no server)
```

**Standalone build.** `artifact/` bundles the same pages with Vite and an in-memory router that stands in for `next/link` and `next/navigation`. The result is a static site that runs without a server. In that build, file downloads (.ics, CSV, JSON export) are switched off and a short notice explains why.

---

## Demo accounts (switchable roles)

There is no password. Switch persona from the start page, from the avatar menu in either app, or from the demo guide. Control and Personal each remember their own persona, so you can be the scheduler in one tab and the actor in another.

| Persona | Role | What they can do |
|---|---|---|
| **Lena Bergström** | Produktionsledare (org admin) | Plan and publish in all 4 productions. Sees acknowledgements, audit log, integrations and security. |
| **Mikael Strand** | Regissör, *Fyren* | Plans **only** *Fyren*. Other productions are hidden in Control. |
| **Sara Lindqvist** | Skådespelare | Plays Ingrid in *Fyren* and Maja in *Vinterresan*. Personal only; Control shows "Ingen behörighet". |
| **Amir Haddad** | Ljudtekniker | Works in two productions and has the right to toggle the **whole production schedule**. |
| **Elsa Nyberg** | Violinist | Sees only her own band rehearsals. |

The four fictional productions are *Fyren* (drama), *Vinterresan* (musical), *Nattfjärilar* (dance) and *Kvinnorna vid havet* (chamber play, currently running). Together they include about 45 people and 10 rooms. The schedule is generated **relative to the current week**, so the demo always looks live.

---

## The 8-step demo flow

The demo guide (the "Demoguide" button) walks through these steps and switches roles automatically.

1. **Scheduler creates a rehearsal.** As Lena, open **Schema** and click an empty time, or press **Ny repetition**. Choose *Fyren*, a time and a room. Rooms show free/busy for the chosen time.
2. **Fast participant selection.** Select scene **1:3**. StageFlow suggests Ingrid (Sara), Mattias, Viveka, the director and the inspicient, and shows why each person is suggested. Then try:
   - **Snabbval**: whole production, departments, saved groups
   - **Roller & scener**: pick characters, including double-cast roles
   - **search**, **"Alla utom…"**, and **Spara grupp** / **Spara som mall**
3. **Conflict check → review → publish.** Room clashes, double bookings, registered unavailability and **dygnsvila < 11 h** (the Swedish 11-hour daily rest rule) are flagged live. **Spara utkast** notifies no one. **Granska & publicera** shows exactly who will be notified, and lets you request an attendance answer.
4. **Cast member sees it.** In Personal as Sara, the rehearsal appears in **Idag**, **Schema** and **Notiser**.
5. **Scheduler changes time or room.** In **Schema → Vecka**, drag the rehearsal to a new time, or in **Dag** drag it to another room. It becomes an *unpublished change* (orange dot). Use **Granska & publicera** in the toast or the side panel.
6. **Affected users acknowledge.** Sara gets a notification with the precise **before → after** change and taps **"Jag har tagit del"**. Acknowledging receipt (*kvittens*) is kept **separate** from the optional attendance answer (*"Jag kommer" / "Kan inte"*).
7. **Manager sees acknowledgement status.** In Control → **Kvittenser**: read / unread / acknowledged per person, attendance answers, a **Påminn ej kvitterade** button (remind those who haven't acknowledged) and the full **Granskningslogg** (audit log, exportable as CSV).
8. **Cast member opens the script scene and rehearses.** From Today ("Öppna scenen i manus") or from the rehearsal details, open the script reader. It highlights your lines and supports bookmarks and private notes. Then use **Repetera scenen med AI-partner**: the other characters' lines are read aloud in distinct voices, your lines stay silent or hidden, and you get hints, speed control, keyboard control (Space / ← / H / P) and an experimental microphone mode.

Bonus: **Control → Manus → Importera manus → "Använd exempel-PDF"**. This parses a fictional PDF script in the browser. You map speakers to characters and scenes to the production, save it for verification, then **Verifiera & publicera**. Only verified scripts are visible to the ensemble.

---

## What is implemented, simulated, and future

### ✅ Implemented (works in the prototype)
- Responsive Control (desktop-first) and Personal (mobile-first, phone frame on desktop), with Swedish UI copy throughout.
- Day (room columns), week, month, room timeline (with utilisation) and list views. Drag-and-drop moves rehearsals across days and rooms.
- Rehearsal editor with templates, duplication, quick durations and room availability.
- Participant picker:
  - one-click group chips with tri-state, departments, saved groups, characters, search, "Alla utom…"
  - scene-based suggestions with reasons
  - per-person conflict badges
- Conflict detection: room double-booking (error), person double-booking, unavailability, and 11 h daily rest (warnings).
- **Draft → review → publish.** Drafts and unpublished changes are never shown in Personal.
- **Targeted notifications** with field-level before/after diffs:
  - newly called, changed, and removed people get different notices
  - people who are unaffected by a call-list change are not disturbed
- Acknowledgement (receipt) is separate from the attendance response. Includes reminders, per-person status, change history and an audit log with CSV export.
- Role-based, production-scoped permissions in every view, with a live permission matrix (Control → Integrationer & säkerhet).
- Personal: Today, day/week/agenda views (the preference is saved), a "whole production" toggle when permitted, an *Ändrad* (changed) badge, a calendar `.ics` download, click-to-call the inspicient, a larger-text mode, dark mode, and export of your own data as JSON.
- Script reader: character highlighting, hide-my-lines self-test, bookmarks, private notes, and links from scheduled rehearsals to scenes.
- AI rehearsal partner: speaks **verbatim** script text through the Web Speech API, with a distinct voice and pitch per character, speed control, auto-advance, hints and stage-direction narration. Experimental speech recognition can advance the scene automatically on your turn.
- PDF/text script import: pdf.js extraction in the browser, then heuristic parsing of scenes, speakers and directions. Front matter is ignored and low-confidence lines are flagged. A human maps and verifies the result before publishing.
- Cast-to-character assignment (including double casting) and an editable scene × character matrix.
- Data is shared live between tabs and the split-screen view.

### 🟡 Simulated
- **Login**: you switch persona instead of authenticating.
- **Storage**: `localStorage` in the browser. Data is per browser, and there's a reset button.
- **Notification delivery**: in-app only. No email, SMS or push is sent.
- **"AI voices"**: the browser's built-in speech synthesis. Voice quality depends on your OS. macOS and iOS ship a Swedish voice; on other systems one may need to be installed. If speech synthesis is missing, the app falls back to timed text.

### ⏭ Future integrations (interfaces exist; nothing is connected)
- **Yesplan** (`src/lib/integrations/adapters.ts` → `VenuePlanningAdapter`). Only a clearly labelled **mock** exists. No claim is made that an integration exists or is feasible until the vendor API and the theatre's configuration have been verified.
- Email, SMS and push providers (`NotificationChannel`), a subscribable calendar feed, SSO, server-side OCR and neural TTS.

---

## Architecture

**Stack:** Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v4 with design tokens · Radix primitives (shadcn-style components written in `src/components/ui`) · Zustand · date-fns (sv locale) · pdf.js · Vitest · Playwright with axe-core.

```
src/
  app/                    routes
    page.tsx              start page / persona picker
    demo/                 split-screen demo
    control/              StageFlow Control (dashboard, schema, repetition/[id], kvittenser, produktioner, manus, integrationer)
    me/                   StageFlow Personal (idag, schema, notiser, repetition/[id], manus, manus/[id]/repetera, profil)
  components/
    ui/                   design-system primitives (Button, Card, Badge, Checkbox, Segmented, Dialog, Sheet, Menu, Toast…)
    control/              calendar views, participant picker, publish dialog, rehearsal sheet
    personal/             cards (next rehearsal, rows, notification + acknowledgement)
  lib/
    types.ts              typed domain model
    domain.ts             pure logic: conflicts, suggestions, diffs, recipient planning
    permissions.ts        RBAC rules (single source of truth for the UI)
    store.ts              demo persistence + actions (create, saveDraft, publish, cancel, acknowledge, respond, remind, casting, scripts…)
    seed/                 fictional data generated relative to the current week
    script-parser.ts      script text → scenes/lines
    pdf-extract.ts        pdf.js text extraction (client-side)
    speech.ts             Web Speech API wrapper (TTS + experimental recognition)
    integrations/         adapter interfaces + mock
supabase/migrations/      production schema proposal with Row Level Security
tests/unit, tests/e2e     Vitest + Playwright (+ axe accessibility audit)
```

**Key design decisions**

- **Versioned rehearsals.** Each rehearsal has `published` and `draft` versions. Planners always work on the draft. Publishing diffs `published → draft`, plans recipients, and creates one *dispatch* with per-recipient *notifications*. This is what makes "no premature notifications" and precise before/after diffs possible.
- **Pure domain logic** (`domain.ts`, `permissions.ts`) is framework-free and unit-tested. The store calls it, so a server API can reuse the same functions.
- **Supabase was deliberately not wired up** for the demo. A real backend needs a hosted project and credentials, and you asked for something clickable immediately. `supabase/migrations/0001_stageflow_schema.sql` contains the intended schema, with:
  - organisation-scoped tenant isolation
  - production-scoped RLS helpers (`can_plan`, `is_member`, `has_full_schedule`)
  - published-only visibility for members
  - recipient-only column grants for acknowledgements
  - an append-only audit log
  - verified-only script access and private annotations

---

## Testing & quality

- `npm test`: **27 unit tests** covering conflict detection (room, person, unavailability, 11 h rest, invalid time), scene suggestions (including double casting), diffs and recipient planning, permissions, the store workflow (create → publish → change → acknowledge → remind), and the script parser (verbatim text guaranteed).
- `npm run test:e2e`, all passing at the time of writing:
  - the full 8-step flow including real **drag-and-drop**
  - permission checks (actor blocked from Control; director sees only own production)
  - PDF import → verification → visible in Personal
  - a mobile (Pixel 7) smoke test with a horizontal-overflow check
  - an **axe WCAG 2.2 AA audit of 12 screens in light and dark mode** (no serious/critical violations)
- `npm run build` succeeds, and `npm run typecheck` is clean.

Accessibility work includes:
- semantic landmarks and a skip link
- visible focus, native checkboxes with tri-state, `aria-pressed` / `aria-checked` on toggles
- `aria-live` for conflicts and toasts
- contrast-checked tokens (≥ 4.5:1 for text)
- 44–56 px touch targets in Personal, keyboard shortcuts in rehearsal mode
- `prefers-reduced-motion` support and a large-text mode

---

## Remaining production requirements

This list is deliberately candid. None of it is solved by the prototype.

1. **Backend & auth.** Supabase/Postgres with the provided RLS policies (to be reviewed and tested with pgTAP), SSO (OIDC/SAML against the theatre's IdP) with MFA, and server-side session handling.
2. **Server-side validation & authorization.** Every mutation through server actions or an API, using schema validation (e.g. zod), CSRF protection, rate limiting and idempotency keys. The client-side checks here only shape the UI.
3. **Notification delivery.** Email/SMS/push providers (preferably EU-hosted), delivery receipts, quiet hours, escalation for unacknowledged short-notice changes, and possibly union/agreement rules for notice periods.
4. **Integrations.** Verify Yesplan's API, the licence terms and the theatre's configuration first. Then build a read-only import for conflict detection before any two-way sync. Add a subscribable iCal feed with revocable signed tokens.
5. **Scripts & AI.**
   - Rights clearance per title, plus a data processing agreement.
   - Private storage with short-lived signed URLs.
   - Server-side OCR for scanned PDFs.
   - EU-hosted neural TTS with **no training or retention** on script text.
   - Watermarking or access logging for script views.
   - Stricter speech-recognition privacy controls.
6. **GDPR.** A DPIA, a records-of-processing entry, retention and deletion schedules for notifications, audit logs and unavailability reasons, and data-subject request tooling. The JSON export here is a start.
7. **Scheduling depth.**
   - Recurring rehearsals, multi-day bulk editing and undo.
   - Working-time and overtime rules from collective agreements.
   - Room equipment and capacity constraints, and resource booking (pianist, technicians).
   - Proper timezone handling (`timestamptz` + Europe/Stockholm).
   - Concurrent-edit conflict resolution.
8. **Operations.** CI/CD, monitoring, backups, incident runbooks, a load test, a penetration test, a formal WCAG audit with real assistive-technology users, and usability testing with both younger and older staff.

---

## Known limitations

- Demo data lives in each browser's `localStorage`. A phone and a laptop do **not** share data; tabs and the `/demo` split view do.
- Voices depend on the operating system. Microphone mode needs a browser with Web Speech recognition (Chrome, Edge or Safari) and microphone permission.
- Native date and time inputs follow the browser's locale.
- `npm audit` reports advisories in Next.js's bundled dependencies. Upgrade Next.js before any production use.
