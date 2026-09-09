-- Learn League: database constraints that are safe to apply after schema reconciliation.
-- Run only after confirming the live database has the current Phase 2 schema.

-- One active/paused viewing session per user/material.
CREATE UNIQUE INDEX IF NOT EXISTS material_access_sessions_one_active_per_user_material
ON public.material_access_sessions (material_id, user_id)
WHERE status IN ('active', 'paused');

-- One pending join request per user/group.
CREATE UNIQUE INDEX IF NOT EXISTS group_join_requests_one_pending_per_user_group
ON public.group_join_requests (group_id, user_id)
WHERE status = 'pending';

-- One pending invitation per invited user/group.
CREATE UNIQUE INDEX IF NOT EXISTS group_invitations_one_pending_per_user_group
ON public.group_invitations (group_id, invited_user_id)
WHERE status = 'pending';

-- Invite codes are already unique at the groups table level in the current Drizzle schema.
-- Storage bucket policies and Supabase RLS are intentionally not included here because
-- the live project's existing policies/schema must be inspected before changing them.
