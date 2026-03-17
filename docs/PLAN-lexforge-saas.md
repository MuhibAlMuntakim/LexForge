# PLAN: LexForge SaaS Core Implementation

## Context
Restructuring LexForge from a generic dashboard into a high-precision **Legal Operations Hub**. This plan addresses the user's concerns about "out-of-context" features and provides a roadmap for production readiness.

## Phase 0: Socratic Gate (Cleared)
- **Data Strategy:** Stick to `mockData.ts` but align schemas with Backend.
- **Connection Architecture:** TanStack Query + Axios (Standardized for robustness).
- **Goal:** Comprehensive route coverage for production SaaS.

## Phase 1: Architectural Foundation
- **API Client:** `src/lib/api/client.ts`
- **Query Provider:** Wrap app in `TanStack Query` for seamless data management.
- **Route Definitions:** Implement Sidebar with full navigation.

## Phase 2: Design Rethink (Legal Operations Hub)
- Replace **"Volatility"** with **"Risk Score Distribution"**.
- Replace **"Total Assets"** with **"Total Contract Inventory"**.
- Introduce **"Remediation Queue"** to replace the generic "Active Reviews".

## Phase 3: Route Implementation
- `/` Dashboard (Rethought metrics)
- `/contracts` (Full inventory with filtering)
- `/upload` (Clean ingestion flow)
- `/review/[id]` (The Side-by-Side Reviewer)
- `/chat` (The RAG-powered Legal Assistant)

## Phase 4: Data Connection
- Map `mockData.ts` to backend `ReviewResponse` types.
- Ensure all screens use TanStack hooks for fetching (with fallback to mocks).

## Phase 5: Verification
- Comprehensive UI/UX Audit.
- Schema validation between Frontend and FastAPI.
