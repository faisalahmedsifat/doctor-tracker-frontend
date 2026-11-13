# Doctor Tracker Frontend

Next.js App Router application for the Doctor Tracker administration dashboard.

## Requirements

- Node.js 22+
- pnpm 12+

## Getting started

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000.

Start the backend and MongoDB before signing in. The browser calls the same-origin `/api/v1` route, which the Next.js server proxies to `API_INTERNAL_URL` (default: `http://localhost:4000/api/v1`).

## Stack

- Next.js App Router + React + TypeScript
- Tailwind CSS 4 + shadcn/ui
- TanStack Query for client-side server state
- Zustand 5 for request-scoped, shared client UI state
- React Hook Form + Zod for forms
- Recharts for analytics

## Dashboard

The protected overview loads its metrics, seven-month registration trend, top-five doctor assignment distribution, and recent-patient list from `GET /api/v1/dashboard/overview`. No sample clinic data is shipped in the dashboard UI. TanStack Query refreshes the overview after doctor/patient mutations and on window focus; the manual refresh action is also available. The dashboard API deliberately returns only the patient fields needed for this summary.

## Shared application UI state

The App Router root mounts `AppUiProvider`, which creates one vanilla Zustand store per provider tree. This avoids a mutable module-level singleton being shared across server requests and keeps the store available to client components without making the root layout a Client Component. Components subscribe through narrow selectors in `useAppUiStore`.

The store owns only cross-route shell state: desktop sidebar preference, mobile navigation visibility, and command-menu visibility. Only the desktop collapsed preference is persisted (versioned, partialized local storage); persistence is rehydrated after mount so the server render and initial client render use the same defaults. Transient overlays are never persisted. TanStack Query remains the source of truth for remote data, React Hook Form owns form state, and page-specific filters remain local to their feature.

The workspace command menu is available from the header and `Ctrl/⌘ + K`. It supports arrow-key selection, Enter to activate, Escape to close, direct navigation, and create actions for doctors, patients, and appointments. The desktop sidebar can be collapsed, and mobile navigation is controlled by the shared UI store. Doctor assignment in the patient form and both patient/doctor selection in appointment scheduling use an accessible, keyboard-operable searchable picker rather than native dropdowns.

## Doctor management

The `/doctors` workspace is a server-authenticated route with a client-side data table. It supports server-side search, specialty/status/registration-date filters, allow-listed sorting, bounded pagination, hospital affiliation, configurable weekly working hours in Asia/Dhaka, create/edit forms with React Hook Form + Zod, and destructive-delete confirmation. TanStack Query owns request caching and invalidation; form state stays local to the form.

The API remains authoritative for validation, uniqueness and authorization. Do not treat hidden UI controls as access control.

## Patient management

The `/patients` workspace provides a protected patient directory with search, status/condition/registration-date filters, pagination, create/edit forms, generated patient numbers, a distinct condition/diagnosis field, and doctor assignment. Removing a patient from a doctor is an unassignment operation that preserves the patient record. The API validates and persists patient records; assigned doctor details are resolved from the doctor collection.

Patient information is sensitive. Do not use real patient data in development or screenshots; production deployment still needs an approved privacy, retention, access-audit, and backup-encryption policy.

## Appointment management

The protected `/appointments` workspace is an Appointment Desk designed around the receptionist workflow. Its default view is today's queue, with Today / Upcoming / All views, patient and appointment search, doctor/status filters, summary counts and quick status/edit/delete actions. Booking starts with the caller's phone number or patient number; matching patient records can be selected or a new patient can be registered in a nested flow without abandoning the booking. The administrator then chooses a doctor, reviews that doctor's configured daily hours and occupied intervals, selects a time, and confirms the visit.

Weekly availability is configured on the doctor record in `Asia/Dhaka` (UTC+6). The UI does not invent clinic hours. If a doctor has no configured schedule, or the selected time is outside it, the API requires an explicit override reason and stores it with the appointment. The API always rechecks half-open interval conflicts inside the transactional scheduling flow; the client-side availability preview is only a convenience. The current schedule model covers recurring weekly hours; date-specific holiday/leave exceptions and intra-day breaks are not yet modeled.

## Authentication

- The browser sends API requests to the same-origin `/api/v1/*` path on the Next.js host. A server-side Route Handler forwards requests to the Express API configured by `API_INTERNAL_URL`.
- The API sets a signed, HttpOnly, SameSite=Lax access cookie on the frontend origin; the frontend never reads or stores the JWT in JavaScript or localStorage.
- Each protected route's server entry point calls the shared `requireAdmin()` helper, which reads the incoming HttpOnly cookie and forwards it server-to-server to `GET /auth/me` before rendering protected content.
- Client-side session state is a TanStack Query cache of the administrator profile, not a credential.
- Logout calls the same-origin proxy to clear the cookie and then clears the client query cache.
- The proxy forwards only to the configured API origin; it is not a general-purpose URL proxy. The API remains the authorization boundary. Every protected API endpoint must independently authenticate and authorize the request.

For Vercel + Railway deployments, set `API_INTERNAL_URL` in Vercel to the Railway API base URL (including `/api/v1`). Set backend `FRONTEND_ORIGIN` to the exact Vercel origin (for example, `https://your-project.vercel.app`). Keep `COOKIE_DOMAIN` unset so the API cookie is host-only for the Vercel frontend origin. Keep `SameSite=Lax` and enable `Secure` through `NODE_ENV=production`. No cross-site cookie configuration is needed because the browser only talks to the Vercel origin.

## Scripts

- `pnpm dev` — local development
- `pnpm build` — production build
- `pnpm start` — production server
- `pnpm typecheck` — TypeScript validation
- `pnpm lint` — lint application code
- `pnpm test:e2e` — run the Playwright browser workflow against the running production frontend and backend; requires Chrome at `/usr/bin/google-chrome`, MongoDB configured in `../backend/.env`, and an API/frontend already running at ports 4000/3000

## Configuration

Set the server-only `API_INTERNAL_URL` to the versioned backend API base URL. Do not use `NEXT_PUBLIC_API_URL`: browser requests must remain relative to the Vercel origin. Browser API requests include credentials (`credentials: include`).
