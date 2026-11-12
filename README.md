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

## Stack
- Next.js App Router + React + TypeScript
- Tailwind CSS 4 + shadcn/ui
- TanStack Query for server state
- TanStack Table for data tables
- React Hook Form + Zod for forms
- Recharts for analytics

## Scripts
- `pnpm dev` — local development
- `pnpm build` — production build
- `pnpm start` — production server
- `pnpm lint` — lint application code

## Configuration
Set `NEXT_PUBLIC_API_URL` to the versioned backend API base URL. The frontend sends cookies with API requests (`credentials: include`).
