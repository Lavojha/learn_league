-- Learn League: safe follow-up hardening for material access sessions.
-- IMPORTANT: this file is intentionally manual/deferred. Existing Supabase databases may
-- contain an older schema, so do not run it until the live schema has been inspected.
--
-- 1) Prevent two active/paused sessions for the same user/material.
CREATE UNIQUE INDEX IF NOT EXISTS material_access_sessions_one_active_per_user_material
ON public.material_access_sessions (material_id, user_id)
WHERE status IN ('active', 'paused');

-- 2) Before enabling Supabase RLS in production, reconcile the live schema and add
-- security-definer membership helpers. Application-level authorization already exists
-- in the Next.js API layer; these policies are intentionally not auto-applied here.
--
-- Recommended helper shape:
-- CREATE OR REPLACE FUNCTION public.is_group_member(target_group uuid, target_user uuid DEFAULT auth.uid())
-- RETURNS boolean
-- LANGUAGE sql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
--   SELECT EXISTS (
--     SELECT 1 FROM public.group_members gm
--     WHERE gm.group_id = target_group
--       AND gm.user_id = target_user
--       AND gm.status = 'active'
--   );
-- $$;

-- 3) Storage buckets should remain private. Signed URLs are generated only after
-- application authorization checks. Bucket policies must be added after inspecting
-- the actual storage schema/configuration in the target Supabase project.
