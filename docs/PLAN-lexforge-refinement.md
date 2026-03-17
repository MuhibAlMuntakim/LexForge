# PLAN: LexForge SaaS Refinement & Bug Fixes

Restructuring LexForge into a specialized **Legal Operations Hub**. This plan addresses broken functionalities, layout overflows, and implements the full route blueprint using robust state management and mock data while **strictly maintaining the current design aesthetics** for all pages.

## User Review Required

> [!IMPORTANT]
> **Preserving Existing Design:** As requested, the current design aesthetics (including the light-themed dashboard and dark-themed/lime-accented settings/compliance pages) will be maintained without any "unification" changes.

> [!NOTE]
> **Mock Data Strategy:** All new functionalities will initially utilize `mockData.ts` and local React state to ensure the frontend is testable before full backend integration.

## Proposed Changes

### [Component Layout & Design Fixes]

#### [MODIFY] [ComplianceMiniCard.tsx](file:///c:/Users/user/.gemini/antigravity/scratch/lexforge/frontend/src/components/dashboard/ComplianceMiniCard.tsx)
- Fix container overflow/border issues for the "Compliance Rate Card".
- Ensure the card is responsive and fits the sidebar/grid correctly.

#### [MODIFY] [ActiveReviewsTable.tsx](file:///c:/Users/user/.gemini/antigravity/scratch/lexforge/frontend/src/components/dashboard/ActiveReviewsTable.tsx)
- Replace **"Latency"** column with **"Risk Priority"** (High/Med/Low).
- Wire the "Full Portfolio" button to route to `/contracts`.

#### [MODIFY] [DashboardShell.tsx](file:///c:/Users/user/.gemini/antigravity/scratch/lexforge/frontend/src/components/layout/DashboardShell.tsx)
- Wire "Add Contract" button to route to `/upload`.
- Implement functional search bar state (global or route-specific pending final decision).

---

### [Route Implementations]

#### [MODIFY] [upload/page.tsx](file:///c:/Users/user/.gemini/antigravity/scratch/lexforge/frontend/src/app/upload/page.tsx)
- **Feature:** Ingestion Engine.
- **State:** `isUploading`, `progress`, `success`.
- **Logic:** Simulate AI latency with a ticking timer. Auto-route to `/contracts` upon success.

#### [MODIFY] [contracts/page.tsx](file:///c:/Users/user/.gemini/antigravity/scratch/lexforge/frontend/src/app/contracts/page.tsx)
- **Feature:** Document Registry.
- **Logic:** Client-side search and category filtering (All, High Risk, Pending).
- **Navigation:** Deep-link row clicks to `/chat/[id]`.

#### [MODIFY] [chat/[id]/page.tsx](file:///c:/Users/user/.gemini/antigravity/scratch/lexforge/frontend/src/app/chat/page.tsx)
- **Feature:** AI Workbench.
- **UI:** Split-screen layout.
- **Tabs:** "Redlines" (Original vs Proposed) and "Q&A" (Vercel AI SDK style streaming).

#### [MODIFY] [playbook/page.tsx](file:///c:/Users/user/.gemini/antigravity/scratch/lexforge/frontend/src/app/playbook/page.tsx)
- **Feature:** Protocol Engine (CRUD).
- **Logic:** Add "New Protocol" modal capturing Title, Severity, and Logic Parameters.

#### [MODIFY] [settings/page.tsx](file:///c:/Users/user/.gemini/antigravity/scratch/lexforge/frontend/src/app/settings/page.tsx)
- **Feature:** Workspace Control.
- **Fix:** Resolve "blur" issue (likely excessive `backdrop-blur` or missing CSS definitions for `glass-panel`).
- **Logic:** Functional "Invite Member" form with email validation and mock success state (adding to a local list of pending members).
- **Aesthetic:** Maintain the existing Dark Glass/Lime design.

---

### [Data Layer]

#### [MODIFY] [mockData.ts](file:///c:/Users/user/.gemini/antigravity/scratch/lexforge/frontend/src/data/mockData.ts)
- Expand mock inventory to cover various risk profiles and categories.
- Add mock `Protocol` and `TeamMember` types.

---

## Verification Plan

### Automated Tests
- Run `npm run lint` to ensure TypeScript and ESLint compliance.

### Manual Verification
- **Upload Flow:** Drag a file, observe the "Processing" timer, and verify redirection to `/contracts`.
- **Contract Filtering:** Type in the search box and click filter pills to verify table reactivity.
- **Button Actions:** Verify all navigation buttons (Add Contract, Full Portfolio, Row Clicks) work correctly.
- **Settings Form:** Send a mock invite and verify the Shadcn Toast appears.
