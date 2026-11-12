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

Start the backend and MongoDB before signing in. The frontend defaults to `http://localhost:4000/api/v1`.

## Stack
- Next.js App Router + React + TypeScript
- Tailwind CSS 4 + shadcn/ui
- TanStack Query for client-side server state
- React Hook Form + Zod for forms
- Recharts for analytics

## Doctor management

The `/doctors` workspace is a server-authenticated route with a client-side data table. It supports server-side search, specialty/status filters, allow-listed sorting, bounded pagination, create/edit forms with React Hook Form + Zod, and destructive-delete confirmation. TanStack Query owns request caching and invalidation; form state stays local to the form.

The API remains authoritative for validation, uniqueness and authorization. Do not treat hidden UI controls as access control.

## Authentication
- The login form sends credentials directly to the Fastify API over HTTPS in production.
- The API sets a signed, HttpOnly, SameSite=Lax access cookie; the frontend never reads or stores the JWT in JavaScript or localStorage.
- Each protected route's server entry point calls the shared `requireAdmin()` helper, which reads the incoming HttpOnly cookie and verifies it with `GET /auth/me` before rendering protected content.
- Client-side session state is a TanStack Query cache of the administrator profile, not a credential.
- Logout calls the API to clear the cookie and then clears the client query cache.
- The API remains the authorization boundary. Every protected API endpoint must independently authenticate and authorize the request.

For production, deploy the frontend and API on the same site (for example, `app.example.com` and `api.example.com`) and configure the backend `COOKIE_DOMAIN=.example.com`. The cookie must be visible to the frontend host so the Next.js server can forward it to the API for server-side verification. Configure the exact frontend origin in backend `FRONTEND_ORIGIN`.

## Scripts
- `pnpm dev` — local development
- `pnpm build` — production build
- `pnpm start` — production server
- `pnpm typecheck` — TypeScript validation
- `pnpm lint` — lint application code

## Configuration
Set `NEXT_PUBLIC_API_URL` to the versioned backend API base URL. Browser API requests include credentials (`credentials: include`).