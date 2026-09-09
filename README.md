# Learn League

Learn League is a study-group platform for focused personal study and collaborative learning.

## Current MVP

- Supabase Auth with protected app routes
- Personal study timer, history, tasks, and private PDF materials
- Public groups with direct joining
- Private groups that are either hidden (invite/code) or discoverable (join request)
- Group hierarchy: Owner → Co-owner → Admin → Member
- Granular owner-controlled role permissions
- Group PDF materials with access windows, timed sessions, pause support, download rules, expiry actions, and progress tracking
- Private Supabase Storage buckets with short-lived signed URLs
- Application-level one-user/one-material active-session enforcement, backed by a deferred database unique index migration

## Stack

Next.js + React + TypeScript + Tailwind CSS, PostgreSQL/Supabase, Drizzle ORM, Zod.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.
5. Verify with `npm run lint`, `npm run typecheck`, and `npm run build`.

## Supabase setup

Create two **private** Storage buckets:

- `materials`
- `personal-materials`

The application generates signed URLs only after authorization checks. Storage policies and production RLS should be configured after inspecting the target Supabase project's existing schema and policies.

## Database migration safety

`drizzle/migrations/0002_material_access_safety.sql` is intentionally marked **manual/deferred**. Do not blindly run it against an existing Supabase project. The repository may be connected to a database with an older schema; inspect/reconcile the live schema first, then apply the compatible migration and RLS/storage policies.

The migration contains the recommended partial unique index preventing two `active`/`paused` material access sessions for the same user/material.

## Access-control note

PDF access is enforced at the application/storage URL layer. A web application cannot absolutely prevent screenshots, screen recording, or copying performed by a user-controlled device after a PDF has been rendered.
