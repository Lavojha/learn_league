# Learn League

Learn League is a study-group platform for focused personal study and collaborative learning.

## Development toolchain

- Node.js `22.19.0`
- npm `11.x`
- Next.js `15.5.3`
- React `19.1.1`
- TypeScript `5.9.2`
- Tailwind CSS `4.1.13`

The project pins dependency versions so local development and CI resolve the same package versions. Use `.nvmrc` to select Node 22.19.0.

## Local verification

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

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

## Supabase setup

Create two **private** Storage buckets:

- `materials`
- `personal-materials`

The application generates signed URLs only after authorization checks. Storage policies and production RLS should be configured after inspecting the target Supabase project's existing schema and policies.

## Database migration safety

The material-access safety migration is intentionally marked **manual/deferred**. Do not blindly run it against an existing Supabase project. Inspect and reconcile the live schema first, then apply the compatible migration and RLS/storage policies.

## Access-control note

PDF access is enforced at the application/storage URL layer. A web application cannot absolutely prevent screenshots, screen recording, or copying performed by a user-controlled device after a PDF has been rendered.
